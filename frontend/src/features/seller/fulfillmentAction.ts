import type { UpdatableFulfillmentStatus } from "@/services/sellerOrderService";
import type { FulfillmentStatus, OrderStatus, SellerOrder } from "@/types/models";

// Backend'deki SHIPPABLE_ORDER_STATUSES ile birebir aynı (order.service.ts,
// updateFulfillmentStatus): sipariş ödeme sürecini tamamlamamışsa (PENDING_PAYMENT,
// PAYMENT_FAILED) veya iptal edilmişse kargo durumu hiç güncellenemez, backend 409 döner.
// PAID kadar SHIPPED/DELIVERED de bu listede: sipariş kargoya verildiğinde order.status'ün
// kendisi de SHIPPED'e döner (deriveOrderStatus), bu yüzden yalnızca "PAID" kontrolü
// "Teslim Edildi" butonunu hiçbir zaman göstermezdi.
const SHIPPABLE_ORDER_STATUSES: readonly OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

export interface FulfillmentAction {
  label: string;
  nextStatus: UpdatableFulfillmentStatus;
  confirmText: string;
}

// Bir satıcının kendi satırları her zaman BİRLİKTE güncellenir (updateFulfillmentStatus
// hepsine aynı anda aynı durumu yazar), bu yüzden ilk satırın durumu satıcının tüm
// satırlarını güvenle temsil eder — satır satır kontrol etmeye gerek yok.
export function getFulfillmentAction(order: SellerOrder): FulfillmentAction | null {
  if (!SHIPPABLE_ORDER_STATUSES.includes(order.status)) {
    return null;
  }

  const ownStatus: FulfillmentStatus | undefined = order.items[0]?.fulfillmentStatus;

  if (ownStatus === "PENDING") {
    return {
      label: "Kargoya Ver",
      nextStatus: "SHIPPED",
      confirmText: "Bu siparişteki ürünleriniz kargoya verilmiş olarak işaretlenecek.",
    };
  }

  if (ownStatus === "SHIPPED") {
    return {
      label: "Teslim Edildi",
      nextStatus: "DELIVERED",
      confirmText: "Bu siparişteki ürünleriniz teslim edilmiş olarak işaretlenecek.",
    };
  }

  return null;
}
