import cors from "cors";
import express, { type Request, type Response } from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env, isDev } from "@/config/env";
import { errorHandler, notFoundHandler } from "@/middlewares";
import { devRoutes } from "@/modules/_dev/dev.routes";
import { authRoutes } from "@/modules/auth/auth.routes";
import { cartRoutes } from "@/modules/cart/cart.routes";
import { catalogRoutes } from "@/modules/product/catalog.routes";
import { productRoutes } from "@/modules/product/product.routes";
import { sendSuccess } from "@/shared";

export const app = express();

// express-rate-limit istemciyi IP ile ayırt eder; proxy arkasında bu ayar olmadan
// tüm istekler tek IP'den geliyormuş gibi görünür.
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

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

// Faz 1 doğrulama route'ları — sadece development'ta mount edilir, prod'da hiç erişilemez
if (isDev) {
  app.use("/api/_dev", devRoutes);
}

app.use(notFoundHandler);
app.use(errorHandler);
