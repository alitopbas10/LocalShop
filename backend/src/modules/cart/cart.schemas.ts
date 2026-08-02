import { z } from "zod";

import { objectIdSchema } from "@/shared/commonSchemas";

export const addItemSchema = z.object({
  productId: objectIdSchema,
  quantity: z.number().int().min(1).max(99).default(1),
});

// min 0 BİLİNÇLİ: quantity 0, "ürünü sepetten çıkar" anlamına gelir. Frontend'de adet
// azaltma butonuyla 0'a düşen kullanıcı için ayrıca DELETE isteği göndermeye gerek kalmaz;
// service katmanı 0 gelen quantity'de item'ı sepetten kaldırır.
export const updateItemSchema = z.object({
  quantity: z.number().int().min(0).max(99),
});

export const cartItemParamSchema = z.object({
  productId: objectIdSchema,
});

export type AddItemInput = z.infer<typeof addItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type CartItemParam = z.infer<typeof cartItemParamSchema>;
