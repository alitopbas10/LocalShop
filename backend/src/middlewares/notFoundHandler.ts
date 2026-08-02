import type { NextFunction, Request, Response } from "express";

import { AppError } from "@/shared/AppError";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl}`));
}
