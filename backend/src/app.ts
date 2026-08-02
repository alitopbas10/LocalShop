import cors from "cors";
import express, { type Request, type Response } from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env, isDev } from "@/config/env";
import { corsOptions, helmetOptions } from "@/config/security";
import {
  errorHandler,
  globalRateLimit,
  notFoundHandler,
  requestId,
  sanitizeInput,
} from "@/middlewares";
import { authRoutes } from "@/modules/auth/auth.routes";
import { cartRoutes } from "@/modules/cart/cart.routes";
import { orderRoutes } from "@/modules/order/order.routes";
import { sellerOrderRoutes } from "@/modules/order/sellerOrder.routes";
import { paymentRoutes } from "@/modules/payment/payment.routes";
import { catalogRoutes } from "@/modules/product/catalog.routes";
import { productRoutes } from "@/modules/product/product.routes";
import { sendSuccess } from "@/shared";

export const app = express();

// express-rate-limit istemciyi IP ile ayırt eder; proxy arkasında bu ayar olmadan
// tüm istekler tek IP'den geliyormuş gibi görünür.
app.set("trust proxy", 1);
// helmet zaten bu başlığı kaldırıyor; açıkça yazmak niyeti belli eder.
app.disable("x-powered-by");

// Middleware sırası: requestId → helmet → cors → globalRateLimit → body parser'lar →
// sanitizeInput → morgan → route'lar → notFoundHandler → errorHandler.
// requestId EN BAŞTA çalışır (helmet'ten bile önce): sonraki hiçbir middleware veya
// route bu id olmadan çalışmamalı — hata ayıklama sırasında "hangi istek" sorusunun
// tek pratik cevabı budur.
// globalRateLimit body parser'lardan ÖNCE çalışır: limite takılan bir isteğin
// gövdesini parse etmek gereksiz iş ve saldırı yüzeyidir (büyük/bozuk gövdeler
// sayaç kontrolünden önce hiç parse edilmemeli).
// sanitizeInput body parser'lardan HEMEN SONRA çalışır: req.body'nin nesne
// olarak var olması gerekir, o yüzden parser'lardan önce çalışamaz; route'lardan
// önce olması gerekir ki NoSQL enjeksiyonu ve prototype pollution denemeleri
// controller/service'e hiç ulaşmadan temizlensin.
app.use(requestId);
app.use(helmet(helmetOptions));
app.use(cors(corsOptions));
app.use(globalRateLimit);
app.use(express.json({ limit: env.REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);

// morgan("dev") request body'sini loglamıyor — bu iyi. Ancak bu satırı ileride bir
// format string'i (ör. ":req[body]" veya özel bir token) ekleyecek şekilde
// DEĞİŞTİRMEYİN: /api/payments/pay endpoint'i kart numarası, CVV ve son kullanma
// tarihi taşıyor, request body loglamak bu veriyi kalıcı loglara yazar.
if (isDev) {
  app.use(morgan("dev"));
}

app.get("/health", (_req: Request, res: Response) => {
  sendSuccess(res, {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);

// Herkese açık katalog: authenticate uygulanmaz.
app.use("/api/products", catalogRoutes);

// /api/seller/products, herkese açık /api/products katalogundan ayrı bir yoldur: aynı yolda
// rol bazlı dallanmak hem route mantığını hem yetkilendirmeyi bulanıklaştırır.
// Ayrı yol = ayrı sorumluluk.
app.use("/api/seller/products", productRoutes);

app.use("/api/cart", cartRoutes);

app.use("/api/orders", orderRoutes);

// /api/seller/orders, herkese açık /api/orders'tan ayrı bir yoldur: satıcı burada
// kendisine gelen siparişleri görür, kendi sipariş geçmişini değil.
app.use("/api/seller/orders", sellerOrderRoutes);

app.use("/api/payments", paymentRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
