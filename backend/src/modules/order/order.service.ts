import mongoose, { Types, type QueryFilter } from "mongoose";

import { Cart } from "@/modules/cart/cart.model";
import * as cartService from "@/modules/cart/cart.service";
import { Order, type IOrder, type IOrderItem, type OrderDocument } from "@/modules/order/order.model";
import { generateOrderNumber } from "@/modules/order/orderNumber";
import {
  canTransitionFulfillment,
  canTransitionOrder,
  type FulfillmentStatus,
  type OrderStatus,
} from "@/modules/order/order.types";
import type { CustomerOrderQuery, SellerOrderQuery } from "@/modules/order/order.schemas";
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

// Hem Mongoose belgesi (OrderDocument) hem de .lean() ile çekilmiş düz nesne bu şekle
// uyar; toOrderView ikisini de kabul edebilsin diye ortak bir tip kullanılır.
type OrderRecord = IOrder & { _id: Types.ObjectId };

// productId/sellerId gibi referans alanlar string'e çevrilir; satıcı adı EKLENMEZ
// (ayrı bir sorgu gerektirir ve müşteri tarafında gösterilmesi gerekmez).
export function toOrderView(order: OrderRecord): OrderView {
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

// ---- MÜŞTERİ SORGULARI ----

const CUSTOMER_ORDER_SORT: Record<CustomerOrderQuery["sort"], Record<string, 1 | -1>> = {
  // Kararlı sayfalama için ikincil sıralama olarak _id kullanılır: createdAt eşit olan
  // kayıtlarda sayfalar arası kayıt tekrarı/atlaması yaşanmasın diye.
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: -1 },
};

export interface CustomerOrderListResult {
  items: OrderView[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getCustomerOrders(
  userId: string,
  query: CustomerOrderQuery,
): Promise<CustomerOrderListResult> {
  const filter: QueryFilter<IOrder> = { userId };
  if (query.status) {
    filter.status = query.status;
  }

  const skip = (query.page - 1) * query.limit;

  const [rawItems, total] = await Promise.all([
    Order.find(filter)
      .sort(CUSTOMER_ORDER_SORT[query.sort])
      .skip(skip)
      .limit(query.limit)
      .lean<OrderRecord[]>(),
    Order.countDocuments(filter),
  ]);

  return {
    items: rawItems.map(toOrderView),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

// Sahiplik doğrulanmış ham belge döner: getCustomerOrderById hem okuma (controller
// toOrderView ile response'a çevirir) hem de mutasyon (cancelOrder) tarafından
// kullanılabilsin diye Mongoose Document döndürür, önceden map'lenmiş görünüm değil.
export async function getCustomerOrderById(userId: string, orderId: string): Promise<OrderDocument> {
  const order = await Order.findById(orderId);
  if (!order) {
    throw AppError.notFound("Order");
  }

  // Sipariş verileri (ürünler, tutar, adres vb.) kişiye özeldir; başkasının siparişine
  // erişim denemesi 403 ile reddedilir.
  if (order.userId.toString() !== userId) {
    throw AppError.forbidden("You do not have permission to access this order");
  }

  return order;
}

export async function cancelOrder(userId: string, orderId: string): Promise<OrderDocument> {
  const order = await getCustomerOrderById(userId, orderId);

  if (!canTransitionOrder(order.status, "CANCELLED")) {
    throw new AppError(
      `Order cannot be cancelled from status ${order.status}`,
      httpStatus.CONFLICT,
      errorCodes.INVALID_STATE_TRANSITION,
    );
  }

  const session = await mongoose.startSession();
  try {
    // İptal edilen bir sipariş, rezerve ettiği stoğu serbest bırakır. İptal kaydı ile
    // stok iadesi ATOMİK olmalıdır: aralarında bir hata oluşursa sipariş iptal
    // görünürken stok geri verilmemiş olur ve envanter kalıcı olarak eksik kalır.
    await session.withTransaction(async () => {
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { stock: item.quantity } },
          { session },
        );
        item.fulfillmentStatus = "CANCELLED";
      }

      order.status = "CANCELLED";
      order.cancelledAt = new Date();

      await order.save({ session });
    });
  } finally {
    await session.endSession();
  }

  return order;
}

// ---- SATICI SORGULARI ----

interface RawSellerOrderBuyer {
  _id: Types.ObjectId;
  name: string;
}

// hem lean liste satırları hem de populate edilmiş Mongoose belgesi (getSellerOrderById)
// bu şekle uyar; toSellerOrderView her iki kaynak için de kullanılabilir.
interface SellerOrderSource {
  _id: Types.ObjectId;
  orderNumber: string;
  status: OrderStatus;
  createdAt: Date;
  userId: RawSellerOrderBuyer | Types.ObjectId;
  items: IOrderItem[];
}

function toBuyerRef(userId: RawSellerOrderBuyer | Types.ObjectId): { name: string | null } {
  if (userId instanceof Types.ObjectId) {
    return { name: null };
  }
  return { name: userId.name };
}

export interface SellerOrderItemView {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
  fulfillmentStatus: FulfillmentStatus;
}

export interface SellerOrderView {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: Date;
  buyer: { name: string | null };
  items: SellerOrderItemView[];
  sellerSubtotal: number;
  itemCount: number;
}

// Bir satıcı, aynı siparişteki başka bir satıcının hangi üründen kaç adet sattığını
// GÖREMEMELİDİR. Bu yüzden satırlar önce bu satıcıya ait olanlara filtrelenir; hem
// dönen "items" listesi hem de "sellerSubtotal"/"itemCount" hesapları SADECE bu
// satıcının satırlarını kapsar.
function toSellerOrderView(order: SellerOrderSource, sellerId: string): SellerOrderView {
  const ownItems = order.items.filter((item) => item.sellerId.toString() === sellerId);

  let subtotalCents = 0;
  let itemCount = 0;

  const items: SellerOrderItemView[] = ownItems.map((item) => {
    subtotalCents += Math.round(item.lineTotal * 100);
    itemCount += item.quantity;

    return {
      productId: item.productId.toString(),
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      fulfillmentStatus: item.fulfillmentStatus,
    };
  });

  return {
    _id: order._id.toString(),
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt,
    buyer: toBuyerRef(order.userId),
    items,
    // order.totalPrice DÖNÜLMEZ: içinde diğer satıcıların tutarı da var. Satıcıya özel
    // toplam yalnızca kendi satırlarından hesaplanır.
    sellerSubtotal: subtotalCents / 100,
    itemCount,
  };
}

const SELLER_ORDER_SORT: Record<SellerOrderQuery["sort"], Record<string, 1 | -1>> = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: -1 },
};

export interface SellerOrderListResult {
  items: SellerOrderView[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getSellerOrders(
  sellerId: string,
  query: SellerOrderQuery,
): Promise<SellerOrderListResult> {
  const filter: QueryFilter<IOrder> = { sellerIds: sellerId };
  if (query.status) {
    filter.status = query.status;
  }
  if (query.fulfillmentStatus) {
    filter.items = { $elemMatch: { sellerId, fulfillmentStatus: query.fulfillmentStatus } };
  }

  const skip = (query.page - 1) * query.limit;

  const [rawItems, total] = await Promise.all([
    Order.find(filter)
      .select("orderNumber status createdAt userId items")
      // Sadece "name" seçilir: alıcının e-postası veya başka kişisel alanları response'a sızmasın.
      .populate("userId", "name")
      .sort(SELLER_ORDER_SORT[query.sort])
      .skip(skip)
      .limit(query.limit)
      .lean<SellerOrderSource[]>(),
    Order.countDocuments(filter),
  ]);

  return {
    items: rawItems.map((order) => toSellerOrderView(order, sellerId)),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

// Sahiplik doğrulanmış HAM BELGE döner (populate edilmiş ama lean değil): hem read
// tarafı (controller toSellerOrderView ile response'a çevirir) hem de mutasyon tarafı
// (updateFulfillmentStatus) aynı fonksiyonu kullanabilsin diye.
export async function getSellerOrderById(sellerId: string, orderId: string): Promise<OrderDocument> {
  // sellerIds filtresi ownership kontrolünü sorgunun içine gömer: bu satıcının hiç
  // satırı olmayan bir siparişte 403 yerine 404 dönülür — o siparişin varlığını bu
  // satıcıya sızdırmanın bir anlamı yok.
  const order = await Order.findOne({ _id: orderId, sellerIds: sellerId }).populate("userId", "name");
  if (!order) {
    throw AppError.notFound("Order");
  }

  return order;
}

// Çok satıcılı bir siparişte tek bir status alanının anlamlı kalması için sipariş
// durumu satırlardan TÜRETİLİR: kurallar if/else zinciri yerine burada tek yerde
// okunabilir durur.
function deriveOrderStatus(items: IOrderItem[], currentStatus: OrderStatus): OrderStatus {
  const activeItems = items.filter((item) => item.fulfillmentStatus !== "CANCELLED");
  if (activeItems.length === 0) {
    return currentStatus;
  }

  if (activeItems.every((item) => item.fulfillmentStatus === "DELIVERED")) {
    return "DELIVERED";
  }

  if (
    activeItems.every(
      (item) => item.fulfillmentStatus === "SHIPPED" || item.fulfillmentStatus === "DELIVERED",
    )
  ) {
    return "SHIPPED";
  }

  // Kısmi kargo: bazı satırlar hâlâ PENDING iken siparişi SHIPPED göstermek yanlış bir
  // izlenim verir, bu yüzden status olduğu gibi (PAID) kalır.
  return currentStatus;
}

const SHIPPABLE_ORDER_STATUSES: readonly OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

export async function updateFulfillmentStatus(
  sellerId: string,
  orderId: string,
  newStatus: Extract<FulfillmentStatus, "SHIPPED" | "DELIVERED">,
): Promise<OrderDocument> {
  const order = await getSellerOrderById(sellerId, orderId);

  // Ödemesi tamamlanmamış (PENDING_PAYMENT, PAYMENT_FAILED) veya iptal edilmiş bir
  // siparişin kargo durumu güncellenemez: fiziksel olarak kargoya çıkmamış bir siparişi
  // "kargolandı" işaretlemek gerçek bir iş kuralı ihlalidir.
  if (!SHIPPABLE_ORDER_STATUSES.includes(order.status)) {
    throw new AppError(
      `Fulfillment status cannot be updated while payment is not completed (order status: ${order.status})`,
      httpStatus.CONFLICT,
      errorCodes.INVALID_STATE_TRANSITION,
    );
  }

  const ownItems = order.items.filter((item) => item.sellerId.toString() === sellerId);

  for (const item of ownItems) {
    if (!canTransitionFulfillment(item.fulfillmentStatus, newStatus)) {
      throw new AppError(
        `Item cannot transition from ${item.fulfillmentStatus} to ${newStatus}`,
        httpStatus.CONFLICT,
        errorCodes.INVALID_STATE_TRANSITION,
      );
    }
  }

  for (const item of ownItems) {
    item.fulfillmentStatus = newStatus;
  }

  order.status = deriveOrderStatus(order.items, order.status);

  await order.save();

  return order;
}
