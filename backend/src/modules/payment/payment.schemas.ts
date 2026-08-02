import { z } from "zod";

import { objectIdSchema } from "@/shared/commonSchemas";

// amount alanı BİLİNÇLİ olarak BURADA YOK: ödenecek tutar istemciden alınmaz, siparişten
// (order.totalPrice) okunur — istemci tutar gönderebilseydi, istediği tutara ödeme kaydı
// oluşturabilirdi. .strict() bu alanı gönderen bir isteği 400 ile reddeder.
export const payCardSchema = z
  .object({
    orderId: objectIdSchema,
    cardNumber: z
      .string()
      .transform((val) => val.replace(/[\s-]/g, ""))
      .refine((val) => /^\d{13,19}$/.test(val), {
        message: "Card number must be 13-19 digits",
      }),
    cardHolder: z.string().trim().min(2).max(100),
    // Format doğrulaması BURADA; kartın gerçekten kabul edilip edilmeyeceği kararı
    // (Luhn, test kartları) sağlayıcı katmanında (fakePay.provider) verilir — format
    // doğrulaması ile kabul kararı farklı sorumluluklardır.
    expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Expiry must be in MM/YY format"),
    cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3-4 digits"),
  })
  .strict();

export const orderPaymentsParamSchema = z.object({
  orderId: objectIdSchema,
});

export type PayCardInput = z.infer<typeof payCardSchema>;
export type OrderPaymentsParam = z.infer<typeof orderPaymentsParamSchema>;
