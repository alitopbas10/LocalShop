// Her istekte DB'ye gidilir: token içindeki rol bilgisine güvenip DB'yi atlamak daha
// hızlı olurdu, ama o zaman silinen kullanıcının token'ı süresi dolana kadar geçerli
// kalır ve rol değişikliği anında etkili olmaz. Bu ölçekte tek indeksli sorgunun
// maliyeti bu riskten düşüktür.
import type { NextFunction, Request, Response } from "express";

import { extractBearerToken, verifyAccessToken } from "@/modules/auth/token.service";
import { User } from "@/modules/auth/user.model";
import { AppError } from "@/shared/AppError";
import { asyncHandler } from "@/shared/asyncHandler";

export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      throw AppError.unauthorized("Authentication required");
    }

    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub);

    if (!user) {
      throw AppError.unauthorized("Authentication required");
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    next();
  },
);
