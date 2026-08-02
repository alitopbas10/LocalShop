import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id format");

// .strict(): tanınmayan bir query anahtarı (ör. bir operatör enjeksiyonu denemesinin
// veya bir yazım hatasının ürettiği anahtar) sessizce yok sayılmaz, 400 ile reddedilir.
export const paginationSchema = z
  .object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  })
  .strict();

export const idParamSchema = z.object({
  id: objectIdSchema,
});
