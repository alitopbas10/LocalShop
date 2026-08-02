import { rateLimit } from "express-rate-limit";

import { env } from "@/config/env";
import type { ApiFailure } from "@/shared/apiResponse";
import { errorCodes } from "@/shared/errorCodes";
import { httpStatus } from "@/shared/httpStatus";

export const authRateLimit = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  handler: (_req, res) => {
    const body: ApiFailure = {
      success: false,
      error: {
        message: "Too many attempts, please try again later",
        code: errorCodes.RATE_LIMIT_EXCEEDED,
      },
    };
    res.status(httpStatus.TOO_MANY_REQUESTS).json(body);
  },
});
