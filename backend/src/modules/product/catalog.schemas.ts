import { z } from "zod";

import { PRODUCT_CATEGORIES } from "@/modules/product/product.types";
import { objectIdSchema, paginationSchema } from "@/shared/commonSchemas";

const CATALOG_SORT_OPTIONS = ["newest", "priceAsc", "priceDesc", "relevance"] as const;

export const catalogQuerySchema = paginationSchema
  .extend({
    category: z.enum(PRODUCT_CATEGORIES).optional(),
    // Boş arama kutusu ("") filtre uygulamamalı; preprocess ile min(2) kontrolünden
    // önce undefined'a çevrilir (aksi halde "" değeri min(2) hatasına düşerdi).
    search: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z.string().trim().min(2).max(100).optional(),
    ),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    // Default VERİLMEDİ: arama varsa relevance, yoksa newest kararı service katmanında verilir.
    sort: z.enum(CATALOG_SORT_OPTIONS).optional(),
  })
  .refine((data) => data.minPrice === undefined || data.maxPrice === undefined || data.minPrice <= data.maxPrice, {
    message: "minPrice cannot be greater than maxPrice",
    path: ["maxPrice"],
  })
  .refine((data) => data.sort !== "relevance" || data.search !== undefined, {
    message: "Relevance sorting requires a search term",
    path: ["sort"],
  });

export const catalogIdParamSchema = z.object({
  id: objectIdSchema,
});

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type CatalogIdParam = z.infer<typeof catalogIdParamSchema>;
