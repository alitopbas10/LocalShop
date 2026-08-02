import { z } from "zod";

import { PRODUCT_CATEGORIES } from "@/modules/product/product.types";
import { objectIdSchema, paginationSchema } from "@/shared/commonSchemas";

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().min(10).max(2000),
  price: z.number().positive().max(1_000_000),
  stock: z.number().int().min(0).max(1_000_000),
  category: z.enum(PRODUCT_CATEGORIES),
  imageUrl: z.preprocess((val) => (val === "" ? undefined : val), z.url().optional()),
});

export const updateProductSchema = createProductSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const productIdParamSchema = z.object({
  id: objectIdSchema,
});

const PRODUCT_SORT_OPTIONS = ["newest", "oldest", "priceAsc", "priceDesc"] as const;

export const sellerProductQuerySchema = paginationSchema.extend({
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  // z.coerce.boolean KULLANILMADI: "false" metni de truthy sayılıp true'ya çevrilir.
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === "true")),
  sort: z.enum(PRODUCT_SORT_OPTIONS).default("newest"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductIdParam = z.infer<typeof productIdParamSchema>;
export type SellerProductQuery = z.infer<typeof sellerProductQuerySchema>;
