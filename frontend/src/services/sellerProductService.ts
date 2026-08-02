import { apiDelete, apiGet, apiPatch, apiPost, assertMeta } from "@/services/apiClient";
import { cleanParams } from "@/utils/cleanParams";
import type { PaginationMeta } from "@/types/api";
import type { ProductCategory, SellerProduct } from "@/types/models";

// Satıcı ürün yönetimi: /api/seller/products altında, sadece "seller" rolüne açık.
// Herkese açık katalog için bkz. catalogService.ts (/api/products).

export type SellerProductSort = "newest" | "oldest" | "priceAsc" | "priceDesc";

export interface ListSellerProductsParams {
  page?: number;
  limit?: number;
  category?: ProductCategory;
  isActive?: boolean;
  sort?: SellerProductSort;
}

export interface ListSellerProductsResult {
  data: SellerProduct[];
  meta: PaginationMeta;
}

export interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: ProductCategory;
  imageUrl?: string;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export async function list(
  params: ListSellerProductsParams = {},
): Promise<ListSellerProductsResult> {
  const { data, meta } = await apiGet<SellerProduct[]>("/seller/products", {
    params: cleanParams(params),
  });
  return { data, meta: assertMeta(meta) };
}

export async function getById(id: string): Promise<SellerProduct> {
  const { data } = await apiGet<SellerProduct>(`/seller/products/${id}`);
  return data;
}

export async function create(input: CreateProductInput): Promise<SellerProduct> {
  const { data } = await apiPost<SellerProduct>("/seller/products", input);
  return data;
}

export async function update(id: string, input: UpdateProductInput): Promise<SellerProduct> {
  const { data } = await apiPatch<SellerProduct>(`/seller/products/${id}`, input);
  return data;
}

export async function deactivate(id: string): Promise<SellerProduct> {
  const { data } = await apiDelete<SellerProduct>(`/seller/products/${id}`);
  return data;
}

export async function activate(id: string): Promise<SellerProduct> {
  const { data } = await apiPatch<SellerProduct>(`/seller/products/${id}/activate`);
  return data;
}
