// GEÇİCİ MODÜL: Faz 1'de kurulan altyapının (AppError, asyncHandler, validate middleware,
// ApiResponse zarfı) uçtan uca çalıştığını doğrulamak için eklendi. Faz 8'de silinecek.
import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { validate } from "@/middlewares/validate";
import { sendSuccess } from "@/shared/apiResponse";
import { AppError } from "@/shared/AppError";
import { asyncHandler } from "@/shared/asyncHandler";
import { paginationSchema } from "@/shared/commonSchemas";
import { getBody, getQuery } from "@/shared/getValidated";

export const devRoutes = Router();

const devValidateBodySchema = z.object({
  email: z.email(),
  age: z.coerce.number().min(18),
});

devRoutes.get("/app-error", () => {
  throw AppError.notFound("Product");
});

devRoutes.get("/unknown-error", () => {
  throw new Error("boom");
});

devRoutes.get(
  "/async-error",
  asyncHandler(async () => {
    await Promise.reject(new Error("boom async"));
  }),
);

devRoutes.post(
  "/validate",
  validate({ body: devValidateBodySchema }),
  (req: Request, res: Response) => {
    const body = getBody<z.infer<typeof devValidateBodySchema>>(req);
    sendSuccess(res, body);
  },
);

devRoutes.get(
  "/validate-query",
  validate({ query: paginationSchema }),
  (req: Request, res: Response) => {
    const query = getQuery<z.infer<typeof paginationSchema>>(req);
    sendSuccess(res, query);
  },
);
