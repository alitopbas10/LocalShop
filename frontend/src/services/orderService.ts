import { apiGet, apiPatch, apiPost, assertMeta } from "@/services/apiClient";
import { cleanParams } from "@/utils/cleanParams";
import type { PaginationMeta } from "@/types/api";
import type { Order, OrderStatus } from "@/types/models";

// Müşteri sipariş uçları: /api/orders, sadece "customer" rolüne açık. Satıcı tarafı için
// bkz. sellerOrderService.ts (/api/seller/orders).

export type OrderSort = "newest" | "oldest";

export interface ListOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  sort?: OrderSort;
}

export interface ListOrdersResult {
  data: Order[];
  meta: PaginationMeta;
}

// Sipariş içeriği sunucudaki sepetten okunur, bu yüzden body göndermeye gerek yok;
// backend zaten boş bir gövde (createOrderSchema .strict()) bekliyor.
export async function createOrder(): Promise<Order> {
  const { data } = await apiPost<Order>("/orders", {});
  return data;
}

export async function listOrders(params: ListOrdersParams = {}): Promise<ListOrdersResult> {
  const { data, meta } = await apiGet<Order[]>("/orders", { params: cleanParams(params) });
  return { data, meta: assertMeta(meta) };
}

export async function getOrder(id: string): Promise<Order> {
  const { data } = await apiGet<Order>(`/orders/${id}`);
  return data;
}

export async function cancelOrder(id: string): Promise<Order> {
  const { data } = await apiPatch<Order>(`/orders/${id}/cancel`);
  return data;
}
