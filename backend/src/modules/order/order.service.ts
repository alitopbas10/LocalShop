import mongoose, { type Types } from "mongoose";

import { Cart } from "@/modules/cart/cart.model";
import * as cartService from "@/modules/cart/cart.service";
import { Order, type IOrder, type IOrderItem, type OrderDocument } from "@/modules/order/order.model";
import { generateOrderNumber } from "@/modules/order/orderNumber";
import type { FulfillmentStatus, OrderStatus } from "@/modules/order/order.types";
import { Product } from "@/modules/product/product.model";
import { AppError } from "@/shared/AppError";
import { errorCodes } from "@/shared/errorCodes";
import { httpStatus } from "@/shared/httpStatus";

const MAX_ORDER_NUMBER_ATTEMPTS = 3;

interface RawOrderProduct {
  _id: Types.ObjectId;
  name: string;
  price: number;
  sellerId: Types.ObjectId;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000;
}

// orderNumber unique index'e çarpan (11000) bir çakışma, sepet/stok durumundan bağımsız
// geçici bir üretim çakışmasıdır; birkaç kez yeniden denemek pratikte yeterlidir.
async function createOrderDocument(
  session: mongoose.ClientSession,
  userId: string,
  items: IOrderItem[],
  totalPrice: number,
  sellerIds: Types.ObjectId[],
): Promise<OrderDocument> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ORDER_NUMBER_ATTEMPTS; attempt += 1) {
    try {
      // Order.create'e session verilirken belge bir DİZİ İÇİNDE geçilmelidir; tekil bir
      // nesne verilirse Mongoose onu ikinci argüman (options) sanır ve session sessizce
      // uygulanmaz — bilinen ve fark edilmesi zor bir Mongoose tuzağı.
      const created = await Order.create(
        [
          {
            orderNumber: generateOrderNumber(),
            userId,
            items,
            totalPrice,
            sellerIds,
          },
        ],
        { session },
      );
      const order = created[0];
      if (!order) {
        throw AppError.internal("Order creation returned no document");
      }
      return order;
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : AppError.internal("Failed to generate a unique order number");
}

export async function createOrder(userId: string): Promise<IOrder> {
  // Ön kontrol TRANSACTION DIŞINDA: kullanıcıya hızlı ve anlaşılır bir hata döner (sepet
  // boş, ürün pasif, stok yetersiz). Bu, gerçek garantinin yerine geçmez — transaction
  // içindeki şartlı güncelleme olmadan iki eşzamanlı istek bu kontrolü aynı anda geçip
  // ikisi de aynı stoğu tüketmeye çalışabilir. Ön kontrol UX içindir, atomik güncelleme
  // doğruluk içindir; ikisi birbirinin yerine geçmez.
  const cartView = await cartService.validateCartForCheckout(userId);
  const cartItems = cartView.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));

  const session = await mongoose.startSession();
  try {
    let createdOrder: OrderDocument | undefined;

    // withTransaction, geçici hatalarda (örn. write conflict) callback'i BAŞTAN
    // YENİDEN ÇALIŞTIRABİLİR. Bu yüzden callback içine idempotent olmayan yan etkiler
    // (log yazma, e-posta gönderme, dış servis çağrısı) KONMAMALIDIR — birden fazla kez
    // tetiklenebilirler.
    await session.withTransaction(async () => {
      for (const item of cartItems) {
        // "Önce findById ile oku, stoğu karşılaştır, sonra save" YAZILMAZ: iki eşzamanlı
        // istek aynı stoğu okuyup ikisi de yeterli görebilir, ikisi de düşer, sonuç
        // negatif stok olur. Şartı ($gte) sorgunun İÇİNE koymak MongoDB'nin tek belge
        // üzerindeki atomik güncelleme garantisinden faydalanır ve bu yarış penceresini
        // tamamen kapatır.
        const result = await Product.updateOne(
          { _id: item.productId, isActive: true, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { session },
        );

        if (result.modifiedCount === 0) {
          throw new AppError(
            "One or more items are no longer available in the requested quantity",
            httpStatus.CONFLICT,
            errorCodes.INSUFFICIENT_STOCK,
            { productId: item.productId, requestedQuantity: item.quantity },
          );
        }
      }

      // Ürünler stok düşümü sırasında zaten sorgulandı; isim ve fiyat için burada TEK
      // sorguda tekrar çekiliyor (N+1 yerine toplu okuma).
      const productIds = cartItems.map((item) => item.productId);
      const products = await Product.find({ _id: { $in: productIds } }, null, { session }).lean<
        RawOrderProduct[]
      >();
      const productById = new Map(products.map((product) => [product._id.toString(), product]));

      let totalCents = 0;
      const sellerIdSet = new Map<string, Types.ObjectId>();

      const orderItems: IOrderItem[] = cartItems.map((cartItem) => {
        const product = productById.get(cartItem.productId);
        if (!product) {
          // Stok düşümü az önce başarılı olduysa ürün mutlaka bulunur; buraya düşülmesi
          // beklenmez, savunma amaçlı bir kontroldür.
          throw AppError.internal("Product disappeared during checkout");
        }

        // Kuruş cinsinden hesaplanır ve en sonda 100'e bölünür; ondalıklı sayıları
        // doğrudan toplamanın biriktirdiği kayan nokta sapması bu şekilde önlenir.
        const lineTotalCents = Math.round(product.price * 100) * cartItem.quantity;
        totalCents += lineTotalCents;
        sellerIdSet.set(product.sellerId.toString(), product.sellerId);

        const item: IOrderItem = {
          productId: product._id,
          sellerId: product.sellerId,
          // SNAPSHOT: ürün sonradan değişse veya silinse bile bu değerler güncellenmez.
          name: product.name,
          price: product.price,
          quantity: cartItem.quantity,
          lineTotal: lineTotalCents / 100,
          fulfillmentStatus: "PENDING" as FulfillmentStatus,
        };
        return item;
      });

      const sellerIds = [...sellerIdSet.values()];

      createdOrder = await createOrderDocument(
        session,
        userId,
        orderItems,
        totalCents / 100,
        sellerIds,
      );

      // Sepet temizleme transaction İÇİNDE yapılır: dışarıda olsaydı sipariş oluşup
      // sepet temizlenmeden bir hata alınabilir, kullanıcı aynı sepetle ikinci kez
      // sipariş oluşturabilirdi.
      await Cart.updateOne({ userId }, { $set: { items: [] } }, { session });
    });

    if (!createdOrder) {
      throw AppError.internal("Order transaction completed without producing an order");
    }

    return createdOrder;
  } finally {
    await session.endSession();
  }
}

// ---- GÖRÜNÜM ----

export interface OrderItemView {
  productId: string;
  sellerId: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
  fulfillmentStatus: FulfillmentStatus;
}

export interface OrderView {
  _id: string;
  orderNumber: string;
  userId: string;
  items: OrderItemView[];
  totalPrice: number;
  status: OrderStatus;
  sellerIds: string[];
  paidAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// productId/sellerId gibi referans alanlar string'e çevrilir; satıcı adı EKLENMEZ
// (ayrı bir sorgu gerektirir ve müşteri tarafında gösterilmesi gerekmez).
export function toOrderView(order: OrderDocument): OrderView {
  return {
    _id: order._id.toString(),
    orderNumber: order.orderNumber,
    userId: order.userId.toString(),
    items: order.items.map((item) => ({
      productId: item.productId.toString(),
      sellerId: item.sellerId.toString(),
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      fulfillmentStatus: item.fulfillmentStatus,
    })),
    totalPrice: order.totalPrice,
    status: order.status,
    sellerIds: order.sellerIds.map((sellerId) => sellerId.toString()),
    paidAt: order.paidAt,
    cancelledAt: order.cancelledAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
