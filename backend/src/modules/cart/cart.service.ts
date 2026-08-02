import type { Types } from "mongoose";

import { Cart, type CartDocument, type ICart } from "@/modules/cart/cart.model";
import { Product } from "@/modules/product/product.model";
import type { ProductCategory } from "@/modules/product/product.types";
import { AppError } from "@/shared/AppError";
import { errorCodes } from "@/shared/errorCodes";
import { httpStatus } from "@/shared/httpStatus";

const MAX_ITEM_QUANTITY = 99;

export type CartItemIssue = "PRODUCT_UNAVAILABLE" | "INSUFFICIENT_STOCK";

export interface CartLineProduct {
  _id: string;
  name: string;
  price: number;
  imageUrl?: string;
  category: ProductCategory;
  stock: number;
}

export interface CartLineItem {
  productId: string;
  quantity: number;
  product: CartLineProduct | null;
  unitPrice: number;
  lineTotal: number;
  available: boolean;
  issue: CartItemIssue | null;
  availableStock: number;
}

export interface CartIssue {
  productId: string;
  productName: string;
  issue: CartItemIssue;
  requested: number;
  available: number;
}

export interface CartView {
  items: CartLineItem[];
  itemCount: number;
  distinctItemCount: number;
  subtotal: number;
  hasIssues: boolean;
  issues: CartIssue[];
}

interface RawCartProduct {
  _id: Types.ObjectId;
  name: string;
  price: number;
  imageUrl?: string;
  category: ProductCategory;
  stock: number;
  isActive: boolean;
}

// ---- ZENGİNLEŞTİRME ----

// Kuruş (cent) cinsine çevirip integer olarak toplamak, ondalıklı sayıları doğrudan
// toplamanın (0.1 + 0.2 gibi) ürettiği kayan nokta sapmasını sepet toplamına taşımaz.
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

export async function buildCartView(cart: ICart): Promise<CartView> {
  const productIds = cart.items.map((item) => item.productId);

  // Tüm ürünler TEK sorguda çekilir; item başına ayrı findById çağırmak N+1 sorguna yol açar.
  const rawProducts = await Product.find({ _id: { $in: productIds } })
    .select("name price imageUrl category stock isActive")
    .lean<RawCartProduct[]>();

  const productById = new Map(rawProducts.map((product) => [product._id.toString(), product]));

  const issues: CartIssue[] = [];
  let itemCount = 0;
  let subtotalCents = 0;

  const items: CartLineItem[] = cart.items.map((cartItem) => {
    const productId = cartItem.productId.toString();
    const product = productById.get(productId);

    itemCount += cartItem.quantity;

    if (!product || !product.isActive) {
      issues.push({
        productId,
        productName: product?.name ?? "Unknown product",
        issue: "PRODUCT_UNAVAILABLE",
        requested: cartItem.quantity,
        available: 0,
      });

      return {
        productId,
        quantity: cartItem.quantity,
        product: null,
        unitPrice: 0,
        lineTotal: 0,
        available: false,
        issue: "PRODUCT_UNAVAILABLE",
        availableStock: 0,
      };
    }

    const lineProduct: CartLineProduct = {
      _id: productId,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
      stock: product.stock,
    };

    const unitPrice = product.price;
    const lineTotal = fromCents(toCents(unitPrice) * cartItem.quantity);

    if (product.stock < cartItem.quantity) {
      issues.push({
        productId,
        productName: product.name,
        issue: "INSUFFICIENT_STOCK",
        requested: cartItem.quantity,
        available: product.stock,
      });

      return {
        productId,
        quantity: cartItem.quantity,
        product: lineProduct,
        unitPrice,
        lineTotal,
        available: false,
        issue: "INSUFFICIENT_STOCK",
        availableStock: product.stock,
      };
    }

    // subtotal'a yalnızca sorunsuz satırlar dahil edilir: müşterinin gördüğü tutar,
    // gerçekten satın alabileceği ürünlerin toplamı olmalı.
    subtotalCents += toCents(lineTotal);

    return {
      productId,
      quantity: cartItem.quantity,
      product: lineProduct,
      unitPrice,
      lineTotal,
      available: true,
      issue: null,
      availableStock: product.stock,
    };
  });

  return {
    items,
    itemCount,
    distinctItemCount: cart.items.length,
    subtotal: fromCents(subtotalCents),
    hasIssues: issues.length > 0,
    issues,
  };
}

// ---- SEPET ERİŞİMİ ----

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000;
}

export async function getOrCreateCart(userId: string): Promise<CartDocument> {
  try {
    // upsert + $setOnInsert atomiktir: "findOne, yoksa create" yazılırsa iki eşzamanlı
    // istek ikisi de "yok" görüp create çağırabilir ve unique index ikincisini
    // duplicate key hatasıyla reddeder.
    const cart = await Cart.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId, items: [] } },
      { upsert: true, new: true },
    );
    if (!cart) {
      throw AppError.internal("Failed to create cart");
    }
    return cart;
  } catch (error) {
    // Defensive: yarış koşulunun dar penceresinde yine de duplicate key oluşursa,
    // az önce başka bir istek tarafından oluşturulan sepeti getirip devam ederiz.
    if (isDuplicateKeyError(error)) {
      const existing = await Cart.findOne({ userId });
      if (existing) {
        return existing;
      }
    }
    throw error;
  }
}

export async function getCart(userId: string): Promise<CartView> {
  const cart = await getOrCreateCart(userId);
  return buildCartView(cart);
}

// ---- MUTASYONLAR ----

export async function addItem(
  userId: string,
  productId: string,
  quantity: number,
): Promise<CartView> {
  // Pasif ürün için de 404: müşteri açısından o ürün yok, sepete eklenemez.
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) {
    throw AppError.notFound("Product");
  }

  const cart = await getOrCreateCart(userId);
  const existingItem = cart.items.find((item) => item.productId.toString() === productId);
  const newQuantity = (existingItem?.quantity ?? 0) + quantity;

  if (newQuantity > product.stock) {
    throw new AppError(
      "Insufficient stock",
      httpStatus.BAD_REQUEST,
      errorCodes.INSUFFICIENT_STOCK,
      { requested: newQuantity, available: product.stock },
    );
  }
  if (newQuantity > MAX_ITEM_QUANTITY) {
    throw AppError.badRequest(`Quantity cannot exceed ${MAX_ITEM_QUANTITY}`);
  }

  if (existingItem) {
    // Var olan satırın adedi ARTIRILIR, üzerine yazılmaz: kullanıcı "sepete ekle"ye
    // ikinci kez bastığında adet 2 olmalı, 1'de kalmamalı.
    existingItem.quantity = newQuantity;
  } else {
    cart.items.push({ productId: product._id, quantity: newQuantity });
  }

  await cart.save();
  return buildCartView(cart);
}

export async function updateItemQuantity(
  userId: string,
  productId: string,
  quantity: number,
): Promise<CartView> {
  if (quantity === 0) {
    return removeItem(userId, productId);
  }

  const cart = await getOrCreateCart(userId);
  const item = cart.items.find((cartItem) => cartItem.productId.toString() === productId);
  if (!item) {
    throw AppError.notFound("Cart item");
  }

  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) {
    throw AppError.notFound("Product");
  }

  if (quantity > product.stock) {
    throw new AppError(
      "Insufficient stock",
      httpStatus.BAD_REQUEST,
      errorCodes.INSUFFICIENT_STOCK,
      { requested: quantity, available: product.stock },
    );
  }

  // Adet MUTLAK olarak atanır, artırılmaz: addItem'dan farklı olarak burada kullanıcı
  // "toplam adedi şuna ayarla" diyor.
  item.quantity = quantity;

  await cart.save();
  return buildCartView(cart);
}

export async function removeItem(userId: string, productId: string): Promise<CartView> {
  const cart = await getOrCreateCart(userId);
  const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
  if (itemIndex === -1) {
    throw AppError.notFound("Cart item");
  }

  cart.items.splice(itemIndex, 1);
  await cart.save();
  return buildCartView(cart);
}

export async function clearCart(userId: string): Promise<CartView> {
  const cart = await getOrCreateCart(userId);
  cart.items.splice(0, cart.items.length);
  await cart.save();
  return buildCartView(cart);
}

// ---- SİPARİŞ İÇİN HAZIRLIK (Faz 6 kullanacak) ----

export async function validateCartForCheckout(userId: string): Promise<CartView> {
  const cart = await getOrCreateCart(userId);
  const cartView = await buildCartView(cart);

  if (cartView.items.length === 0) {
    throw AppError.badRequest("Cart is empty");
  }

  if (cartView.hasIssues) {
    throw new AppError(
      "Cart has items that are no longer available in the requested quantity",
      httpStatus.CONFLICT,
      errorCodes.INSUFFICIENT_STOCK,
      cartView.issues,
    );
  }

  return cartView;
}
