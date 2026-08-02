import { z } from "zod";

import { ORDER_STATUSES, FULFILLMENT_STATUSES } from "@/modules/order/order.types";
import { objectIdSchema, paginationSchema } from "@/shared/commonSchemas";

const ORDER_SORT_OPTIONS = ["newest", "oldest"] as const;

// Body BİLİNÇLİ olarak boş: sipariş içeriği istemciden alınmaz, sunucudaki sepetten
// okunur. İstemci ürün listesi veya fiyat gönderebilseydi, istediği fiyata sipariş
// oluşturabilirdi — bu yüzden .strict() ile beklenmeyen hiçbir alan kabul edilmez.
export const createOrderSchema = z.object({}).strict();

export const orderIdParamSchema = z.object({
  id: objectIdSchema,
});

export const customerOrderQuerySchema = paginationSchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  sort: z.enum(ORDER_SORT_OPTIONS).default("newest"),
});

export const sellerOrderQuerySchema = paginationSchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  fulfillmentStatus: z.enum(FULFILLMENT_STATUSES).optional(),
  sort: z.enum(ORDER_SORT_OPTIONS).default("newest"),
});

// Satıcı yalnızca SHIPPED veya DELIVERED durumuna geçirebilir; PENDING'e geri dönüş
// veya CANCELLED verme yetkisi yok (iptal ayrı bir akıştır).
export const updateFulfillmentSchema = z.object({
  status: z.enum(["SHIPPED", "DELIVERED"]),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
export type CustomerOrderQuery = z.infer<typeof customerOrderQuerySchema>;
export type SellerOrderQuery = z.infer<typeof sellerOrderQuerySchema>;
export type UpdateFulfillmentInput = z.infer<typeof updateFulfillmentSchema>;
