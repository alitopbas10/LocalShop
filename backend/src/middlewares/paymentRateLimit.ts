import { rateLimit } from "express-rate-limit";

import type { ApiFailure } from "@/shared/apiResponse";
import { errorCodes } from "@/shared/errorCodes";
import { httpStatus } from "@/shared/httpStatus";

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 20;

// Ödeme endpoint'i kart deneme saldırılarının (card testing) hedefidir: saldırgan çalıntı
// kart numaralarından hangisinin geçerli olduğunu bulmak için bunları sırayla dener.
// skipSuccessfulRequests: false BİLİNÇLİ — başarılı denemeler de sayaca dahil edilir;
// aksi halde saldırgan geçerli bir kart bulduğu anda sayaç sıfırlanır ve pratikte
// sınırsız deneme hakkı elde eder. Sıkı ve sabit bir limit bu saldırı sınıfına karşı
// gereklidir.
export const paymentRateLimit = rateLimit({
  windowMs: WINDOW_MINUTES * 60 * 1000,
  limit: MAX_ATTEMPTS,
  skipSuccessfulRequests: false,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    const body: ApiFailure = {
      success: false,
      error: {
        message: "Too many payment attempts, please try again later",
        code: errorCodes.RATE_LIMIT_EXCEEDED,
      },
    };
    res.status(httpStatus.TOO_MANY_REQUESTS).json(body);
  },
});
