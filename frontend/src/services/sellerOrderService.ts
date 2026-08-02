import { apiGet, apiPatch, assertMeta } from "@/services/apiClient";
import { cleanParams } from "@/utils/cleanParams";
import type { PaginationMeta } from "@/types/api";
import type { FulfillmentStatus, OrderStatus, SellerOrder } from "@/types/models";

// Satıcıya gelen siparişler: /api/seller/orders, sadece "seller" rolüne açık.

export type SellerOrderSort = "newest" | "oldest";

export interface ListIncomingOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  fulfillmentStatus?: FulfillmentStatus;
  sort?: SellerOrderSort;
}

export interface ListIncomingOrdersResult {
  data: SellerOrder[];
  meta: PaginationMeta;
}

// Satıcı yalnızca SHIPPED veya DELIVERED durumuna geçirebilir (bkz. backend
// updateFulfillmentSchema); PENDING'e dönüş veya CANCELLED verme yetkisi yok.
export type UpdatableFulfillmentStatus = Extract<FulfillmentStatus, "SHIPPED" | "DELIVERED">;

export async function listIncoming(
  params: ListIncomingOrdersParams = {},
): Promise<ListIncomingOrdersResult> {
  const { data, meta } = await apiGet<SellerOrder[]>("/seller/orders", {
    params: cleanParams(params),
  });
  return { data, meta: assertMeta(meta) };
}

export async function getById(id: string): Promise<SellerOrder> {
  const { data } = await apiGet<SellerOrder>(`/seller/orders/${id}`);
  return data;
}

export async function updateFulfillment(
  orderId: string,
  status: UpdatableFulfillmentStatus,
): Promise<SellerOrder> {
  const { data } = await apiPatch<SellerOrder>(`/seller/orders/${orderId}/fulfillment`, {
    status,
  });
  return data;
}
