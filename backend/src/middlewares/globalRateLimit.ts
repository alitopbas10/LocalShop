import type { Request } from "express";
import { rateLimit } from "express-rate-limit";

import { env } from "@/config/env";
import type { ApiFailure } from "@/shared/apiResponse";
import { errorCodes } from "@/shared/errorCodes";
import { httpStatus } from "@/shared/httpStatus";

// Bu limiter, authRateLimit ve paymentRateLimit'in YERİNE GEÇMEZ; onların üzerine
// bir kat daha ekler. Genel limit tüm API'yi kapsayacak şekilde gevşek tutulur
// (varsayılan 300/15dk), auth ve payment gibi hassas endpoint'ler kendi sıkı
// limitlerini ayrıca uygular. Katmanlı yapı: genel + endpoint'e özel.
export const globalRateLimit = rateLimit({
  windowMs: env.GLOBAL_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit: env.GLOBAL_RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req: Request) =>
    env.NODE_ENV === "test" ||
    // Sağlık kontrolü izleme sistemleri tarafından sık çağrılır, onları
    // engellemek izlemeyi kör eder.
    (req.method === "GET" && req.path === "/health") ||
    // Dokümantasyonda gezinirken limite takılmanın bir anlamı yok; Swagger UI
    // tek sayfa yüklemesinde bile /api/docs.json'a birden fazla istek atabilir.
    (req.method === "GET" && req.path.startsWith("/api/docs")),
  handler: (_req, res) => {
    const body: ApiFailure = {
      success: false,
      error: {
        message: "Too many requests, please try again later",
        code: errorCodes.RATE_LIMIT_EXCEEDED,
      },
    };
    res.status(httpStatus.TOO_MANY_REQUESTS).json(body);
  },
});
