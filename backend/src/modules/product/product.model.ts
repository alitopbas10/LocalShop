import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

import { PRODUCT_CATEGORIES, type ProductCategory } from "@/modules/product/product.types";

export interface IProduct {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: ProductCategory;
  sellerId: Types.ObjectId;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductModel = Model<IProduct>;

export type ProductDocument = HydratedDocument<IProduct>;

// Math.round(v * 100) === v * 100 kayan nokta hatasına düşer (örn. 1.005); string
// üzerinden ondalık basamak sayısını kontrol etmek güvenli.
function hasAtMostTwoDecimals(value: number): boolean {
  return /^\d+(\.\d{1,2})?$/.test(value.toString());
}

const HTTP_URL_REGEX = /^https?:\/\/.+/i;

const productSchema = new Schema<IProduct, ProductModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: hasAtMostTwoDecimals,
        message: "Price can have at most 2 decimal places",
      },
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Stock must be an integer",
      },
    },
    category: {
      type: String,
      enum: PRODUCT_CATEGORIES,
      required: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    imageUrl: {
      type: String,
      trim: true,
      match: [HTTP_URL_REGEX, "Invalid image URL format"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ sellerId: 1, createdAt: -1 });
// Ağırlık: isimde geçen eşleşme açıklamada geçenden 10 kat değerli sayılır.
productSchema.index(
  { name: "text", description: "text" },
  { weights: { name: 10, description: 1 }, name: "product_text_index" },
);

export const Product = model<IProduct, ProductModel>("Product", productSchema);
