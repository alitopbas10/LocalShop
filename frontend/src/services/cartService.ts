import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/apiClient";
import type { CartView } from "@/types/models";

// /api/cart, sadece "customer" rolüne açık. Her mutasyon backend'in güncel CartView'ını
// döner; çağıran taraf ayrıca getCart() çağırmak zorunda kalmaz.

export async function getCart(): Promise<CartView> {
  const { data } = await apiGet<CartView>("/cart");
  return data;
}

export async function addItem(productId: string, quantity: number): Promise<CartView> {
  const { data } = await apiPost<CartView>("/cart/items", { productId, quantity });
  return data;
}

export async function updateItem(productId: string, quantity: number): Promise<CartView> {
  const { data } = await apiPatch<CartView>(`/cart/items/${productId}`, { quantity });
  return data;
}

export async function removeItem(productId: string): Promise<CartView> {
  const { data } = await apiDelete<CartView>(`/cart/items/${productId}`);
  return data;
}

export async function clearCart(): Promise<CartView> {
  const { data } = await apiDelete<CartView>("/cart");
  return data;
}
