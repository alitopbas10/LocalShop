import type { QueryFilter } from "mongoose";

import type { CatalogQuery } from "@/modules/product/catalog.schemas";
import { Product, type IProduct, type ProductDocument } from "@/modules/product/product.model";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/modules/product/product.types";
import { AppError } from "@/shared/AppError";

type ResolvedSort = "newest" | "priceAsc" | "priceDesc" | "relevance";

const SORT_FIELDS: Record<ResolvedSort, Record<string, 1 | -1 | { $meta: string }>> = {
  newest: { createdAt: -1 },
  priceAsc: { price: 1 },
  priceDesc: { price: -1 },
  relevance: { score: { $meta: "textScore" } },
};

const CATALOG_LIST_FIELDS = ["name", "price", "stock", "category", "imageUrl", "sellerId", "createdAt"] as const;

// sort verilmemişse: arama varsa alaka düzeyine göre, yoksa en yeniye göre sırala.
function resolveSort(query: CatalogQuery): ResolvedSort {
  if (query.sort) {
    return query.sort;
  }
  return query.search !== undefined ? "relevance" : "newest";
}

export interface CatalogListResult {
  items: ProductDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listCatalog(query: CatalogQuery): Promise<CatalogListResult> {
  // Pasif ürünler katalogda ASLA görünmemeli: bu satır atlanırsa satıcının pasifleştirdiği
  // (soft-delete edilmiş) ürünler yine müşteriye görünür hale gelir.
  const filter: QueryFilter<IProduct> = { isActive: true };

  if (query.category) {
    filter.category = query.category;
  }

  const priceFilter: { $gte?: number; $lte?: number } = {};
  if (query.minPrice !== undefined) {
    priceFilter.$gte = query.minPrice;
  }
  if (query.maxPrice !== undefined) {
    priceFilter.$lte = query.maxPrice;
  }
  if (Object.keys(priceFilter).length > 0) {
    filter.price = priceFilter;
  }

  if (query.search !== undefined) {
    filter.$text = { $search: query.search };
  }

  const resolvedSort = resolveSort(query);

  // Kararlı sıralama: price/createdAt değerleri eşit olan kayıtlarda ikincil sıralama
  // olmadan sayfalar arasında kayıt tekrarı ya da atlanması yaşanabilir.
  const sortSpec: Record<string, 1 | -1 | { $meta: string }> = { ...SORT_FIELDS[resolvedSort], _id: -1 };

  const projection: Record<string, 1 | { $meta: string }> = Object.fromEntries(
    CATALOG_LIST_FIELDS.map((field) => [field, 1 as const]),
  );
  if (resolvedSort === "relevance") {
    // MongoDB, textScore meta alanı projeksiyona eklenmeden ona göre sıralamaya izin vermez.
    projection.score = { $meta: "textScore" };
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .select(projection)
      // Sadece "name" seçilir: alan seçimi yapılmazsa satıcının e-posta adresi ve tüm
      // User alanları response'a sızar.
      .populate("sellerId", "name")
      .sort(sortSpec)
      .skip(skip)
      .limit(query.limit),
    Product.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function getCatalogProductById(productId: string): Promise<ProductDocument> {
  // isActive:false bir ürün için de 404 dönülür: müşteri açısından o ürün hiç yok, aktif/pasif
  // ayrımını sızdırmanın (ör. 403 dönerek) bir güvenlik ya da UX faydası yok.
  const product = await Product.findOne({ _id: productId, isActive: true }).populate("sellerId", "name");
  if (!product) {
    throw AppError.notFound("Product");
  }

  return product;
}

export interface CategoryCount {
  value: ProductCategory;
  count: number;
}

interface CategoryCountAggregation {
  _id: ProductCategory;
  count: number;
}

export async function getCategories(): Promise<CategoryCount[]> {
  const counts = await Product.aggregate<CategoryCountAggregation>([
    { $match: { isActive: true } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);

  const countByCategory = new Map(counts.map((entry) => [entry._id, entry.count]));

  // Ürünü olmayan kategoriler de count:0 ile listede yer alır ki frontend filtre
  // listesini eksiksiz gösterebilsin.
  return PRODUCT_CATEGORIES.map((category) => ({
    value: category,
    count: countByCategory.get(category) ?? 0,
  }));
}
