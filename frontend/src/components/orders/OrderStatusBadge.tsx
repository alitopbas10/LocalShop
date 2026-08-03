import { Badge, type BadgeVariant } from "@/components/ui";
import type { FulfillmentStatus, OrderStatus } from "@/types/models";

// Hem müşteri (features/orders) hem satıcı (features/seller) ekranlarında aynı
// OrderStatus/FulfillmentStatus değerleri gösterilir; eşleme tek yerde tutulur ki iki
// ekran farklı gün farklı metinler göstermeye başlamasın.
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Ödeme Bekliyor",
  PAID: "Ödendi",
  PAYMENT_FAILED: "Ödeme Başarısız",
  SHIPPED: "Kargoda",
  DELIVERED: "Teslim Edildi",
  CANCELLED: "İptal Edildi",
};

const ORDER_STATUS_VARIANTS: Record<OrderStatus, BadgeVariant> = {
  PENDING_PAYMENT: "warning",
  PAID: "info",
  PAYMENT_FAILED: "danger",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "neutral",
};

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
  PENDING: "Hazırlanıyor",
  SHIPPED: "Kargoda",
  DELIVERED: "Teslim Edildi",
  CANCELLED: "İptal",
};

const FULFILLMENT_STATUS_VARIANTS: Record<FulfillmentStatus, BadgeVariant> = {
  PENDING: "warning",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "neutral",
};

// Backend'deki iş kurallarının (order.service.ts / payment.service.ts) frontend
// kopyasıdır — sadece hangi aksiyon butonlarının gösterileceğine karar vermek içindir,
// gerçek kabul/red kararı her zaman backend'de (canTransitionOrder /
// PAYABLE_ORDER_STATUSES) verilir.
export const PAYABLE_ORDER_STATUSES: readonly OrderStatus[] = ["PENDING_PAYMENT", "PAYMENT_FAILED"];

// ORDER_STATUS_TRANSITIONS'a göre CANCELLED'a geçebilen durumlar: PENDING_PAYMENT,
// PAYMENT_FAILED, PAID. SHIPPED/DELIVERED/CANCELLED bir sipariş artık iptal edilemez.
export const CANCELLABLE_ORDER_STATUSES: readonly OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAYMENT_FAILED",
  "PAID",
];

export interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return <Badge variant={ORDER_STATUS_VARIANTS[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

export interface FulfillmentStatusBadgeProps {
  status: FulfillmentStatus;
}

export function FulfillmentStatusBadge({ status }: FulfillmentStatusBadgeProps) {
  return <Badge variant={FULFILLMENT_STATUS_VARIANTS[status]}>{FULFILLMENT_STATUS_LABELS[status]}</Badge>;
}
