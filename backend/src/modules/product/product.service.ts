import type { QueryFilter } from "mongoose";

import { Product, type IProduct, type ProductDocument } from "@/modules/product/product.model";
import type {
  CreateProductInput,
  SellerProductQuery,
  UpdateProductInput,
} from "@/modules/product/product.schemas";
import { AppError } from "@/shared/AppError";

const SORT_OPTIONS: Record<SellerProductQuery["sort"], Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  priceAsc: { price: 1 },
  priceDesc: { price: -1 },
};

export async function createProduct(
  sellerId: string,
  input: CreateProductInput,
): Promise<ProductDocument> {
  // sellerId parametreden alınır, input'tan asla okunmaz: Zod şemasında da bu alan yok,
  // aksi halde bir satıcı başka bir satıcının adına ürün ekleyebilirdi.
  return Product.create({ ...input, sellerId });
}

export interface SellerProductListResult {
  items: ProductDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getSellerProducts(
  sellerId: string,
  query: SellerProductQuery,
): Promise<SellerProductListResult> {
  const filter: QueryFilter<IProduct> = { sellerId };
  if (query.category) {
    filter.category = query.category;
  }
  // isActive verilmemişse filtrelenmez: satıcı kendi arşivini (pasif ürünler dahil) görebilmeli.
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive;
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Product.find(filter).sort(SORT_OPTIONS[query.sort]).skip(skip).limit(query.limit),
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

export async function getSellerProductById(
  sellerId: string,
  productId: string,
): Promise<ProductDocument> {
  const product = await Product.findById(productId);
  if (!product) {
    throw AppError.notFound("Product");
  }

  // 404 ve 403 ayrı kontrol edilir: 404 "böyle bir ürün yok", 403 "var ama senin değil".
  // Ürünler zaten herkese açık katalogda listelendiği için varlıklarını gizlemenin güvenlik
  // değeri yok; net ayrım hata ayıklamayı kolaylaştırıyor.
  if (product.sellerId.toString() !== sellerId) {
    throw AppError.forbidden("You do not have permission to access this product");
  }

  return product;
}

export async function updateProduct(
  sellerId: string,
  productId: string,
  input: UpdateProductInput,
): Promise<ProductDocument> {
  const product = await getSellerProductById(sellerId, productId);

  // Zod şeması zaten sellerId/isActive/_id kabul etmiyor; burada da defense-in-depth
  // için yalnızca izin verilen alanlar atanır.
  if (input.name !== undefined) {
    product.name = input.name;
  }
  if (input.description !== undefined) {
    product.description = input.description;
  }
  if (input.price !== undefined) {
    product.price = input.price;
  }
  if (input.stock !== undefined) {
    product.stock = input.stock;
  }
  if (input.category !== undefined) {
    product.category = input.category;
  }
  if (input.imageUrl !== undefined) {
    product.imageUrl = input.imageUrl;
  }

  // findByIdAndUpdate yerine save(): schema validator'ların (fiyat ondalık, stok integer vb.) çalışması için.
  await product.save();
  return product;
}

// Soft delete: gerçek silme bu ürünü içeren sepetleri ve sipariş geçmişini kırar
// (referans bütünlüğü bozulur). isActive=false ürünü yalnızca katalogdan gizler.
export async function deactivateProduct(
  sellerId: string,
  productId: string,
): Promise<ProductDocument> {
  const product = await getSellerProductById(sellerId, productId);

  if (!product.isActive) {
    throw AppError.conflict("Product is already inactive");
  }

  product.isActive = false;
  await product.save();
  return product;
}

export async function activateProduct(
  sellerId: string,
  productId: string,
): Promise<ProductDocument> {
  const product = await getSellerProductById(sellerId, productId);

  product.isActive = true;
  await product.save();
  return product;
}
