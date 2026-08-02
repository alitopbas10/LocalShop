import { apiGet, apiPost } from "@/services/apiClient";
import type { PayOrderResult, Payment } from "@/types/models";

// /api/payments, sadece "customer" rolüne açık. amount alanı burada YOK: tutar sunucuda
// order.totalPrice'tan okunur, istemciden alınmaz (payCardSchema .strict()).

export interface PayInput {
  orderId: string;
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
}

// idempotencyKey verilirse Idempotency-Key header'ı ile gönderilir: aynı anahtarla
// yapılan tekrar denemeler (ör. çift tıklama, ağ zaman aşımı sonrası retry) kartı
// ikinci kez çekmez, backend aynı ödeme sonucunu döner.
export async function pay(input: PayInput, idempotencyKey?: string): Promise<PayOrderResult> {
  const { data } = await apiPost<PayOrderResult>("/payments/pay", input, {
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  });
  return data;
}

export async function getOrderPayments(orderId: string): Promise<Payment[]> {
  const { data } = await apiGet<Payment[]>(`/payments/order/${orderId}`);
  return data;
}
