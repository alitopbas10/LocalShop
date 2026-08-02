// ÖNEMLİ: authorize() sadece ROL kontrolü yapar, SAHİPLİK kontrolü yapmaz. Bir seller'ın
// başka bir seller'ın ürününü düzenlemesini engellemez. Sahiplik kontrolü ilgili service
// katmanında (sellerId === req.user.id) ayrıca yapılmalıdır. Bu ayrımı atlamak klasik
// IDOR açığıdır.
import type { NextFunction, Request, Response } from "express";

import type { UserRole } from "@/modules/auth/user.types";
import { AppError } from "@/shared/AppError";

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw AppError.forbidden("You do not have permission to perform this action");
    }

    next();
  };
}
