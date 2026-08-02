export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "PAYMENT_FAILED",
  "SHIPPED",
  "DELIVERED",
  // Case study'de yer almıyor, bilinçli eklendi: ödemesi hiç yapılmamış veya başarısız
  // olan bir siparişin rezerve ettiği stoğu serbest bırakmak için bir terminal duruma
  // ihtiyaç var. CANCELLED bu amaca hizmet eder.
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const FULFILLMENT_STATUSES = ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

// Geçiş kuralları if/else zinciri yerine veri olarak tutulur: yeni bir durum eklenirken
// veya bir geçiş kuralı değişirken tek bir yere bakmak yeterli olur, koda dağılmış
// kontrolleri avlamak gerekmez.
const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING_PAYMENT: ["PAID", "PAYMENT_FAILED", "CANCELLED"],
  PAYMENT_FAILED: ["PAID", "CANCELLED"],
  PAID: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const FULFILLMENT_TRANSITIONS: Readonly<Record<FulfillmentStatus, readonly FulfillmentStatus[]>> = {
  PENDING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export function canTransitionFulfillment(from: FulfillmentStatus, to: FulfillmentStatus): boolean {
  return FULFILLMENT_TRANSITIONS[from].includes(to);
}
