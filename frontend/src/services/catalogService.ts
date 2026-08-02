import { apiGet, assertMeta } from "@/services/apiClient";
import { cleanParams } from "@/utils/cleanParams";
import type { PaginationMeta } from "@/types/api";
import type { CatalogCategoryCount, CatalogDetail, CatalogListItem, ProductCategory } from "@/types/models";

// Herkese açık katalog: GET /api/products, GET /api/products/:id, GET /api/products/categories
// (satıcı ürün yönetimi ayrı bir yolda: /api/seller/products, bkz. sellerProductService.ts)

export type CatalogSort = "newest" | "priceAsc" | "priceDesc" | "relevance";

export interface ListProductsParams {
  page?: number;
  limit?: number;
  category?: ProductCategory;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: CatalogSort;
}

export interface ListProductsResult {
  data: CatalogListItem[];
  meta: PaginationMeta;
}

export async function listProducts(params: ListProductsParams = {}): Promise<ListProductsResult> {
  const { data, meta } = await apiGet<CatalogListItem[]>("/products", {
    params: cleanParams(params),
  });
  return { data, meta: assertMeta(meta) };
}

export async function getProduct(id: string): Promise<CatalogDetail> {
  const { data } = await apiGet<CatalogDetail>(`/products/${id}`);
  return data;
}

export async function getCategories(): Promise<CatalogCategoryCount[]> {
  const { data } = await apiGet<CatalogCategoryCount[]>("/products/categories");
  return data;
}
