import { Types } from "mongoose";

import type { ProductCategory } from "@/modules/product/product.types";

interface RawSeller {
  _id: Types.ObjectId;
  name: string;
}

// sellerId, populate edilmişse { _id, name } nesnesi, edilmemişse ham ObjectId'dir.
// Mapper her iki durumu da karşılar ki çağıran taraf bu ayrımı bilmek zorunda kalmasın.
export interface RawCatalogProduct {
  _id: Types.ObjectId;
  name: string;
  price: number;
  stock: number;
  category: ProductCategory;
  imageUrl?: string;
  sellerId: Types.ObjectId | RawSeller;
  createdAt: Date;
}

export interface RawCatalogProductDetail extends RawCatalogProduct {
  description: string;
  updatedAt: Date;
}

interface SellerRef {
  _id: string;
  name: string | null;
}

export interface CatalogListItem {
  _id: string;
  name: string;
  price: number;
  stock: number;
  category: ProductCategory;
  imageUrl?: string;
  inStock: boolean;
  seller: SellerRef;
  createdAt: Date;
}

export interface CatalogDetail {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: ProductCategory;
  imageUrl?: string;
  inStock: boolean;
  seller: SellerRef;
  createdAt: Date;
  updatedAt: Date;
}

function toSellerRef(sellerId: Types.ObjectId | RawSeller): SellerRef {
  if (sellerId instanceof Types.ObjectId) {
    return { _id: sellerId.toString(), name: null };
  }
  return { _id: sellerId._id.toString(), name: sellerId.name };
}

export function toCatalogListItem(product: RawCatalogProduct): CatalogListItem {
  return {
    _id: product._id.toString(),
    name: product.name,
    price: product.price,
    stock: product.stock,
    category: product.category,
    imageUrl: product.imageUrl,
    // Frontend'in stok sayısını yorumlamasına gerek kalmaz, "Tükendi" rozeti doğrudan bu alana bakar.
    inStock: product.stock > 0,
    seller: toSellerRef(product.sellerId),
    createdAt: product.createdAt,
  };
}

export function toCatalogDetail(product: RawCatalogProductDetail): CatalogDetail {
  return {
    _id: product._id.toString(),
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    category: product.category,
    imageUrl: product.imageUrl,
    inStock: product.stock > 0,
    seller: toSellerRef(product.sellerId),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
