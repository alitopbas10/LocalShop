import type { Request, Response } from "express";

import * as authService from "@/modules/auth/auth.service";
import type { LoginInput, RegisterInput } from "@/modules/auth/auth.schemas";
import { AppError } from "@/shared/AppError";
import { sendCreated, sendSuccess } from "@/shared/apiResponse";
import { asyncHandler } from "@/shared/asyncHandler";
import { getBody } from "@/shared/getValidated";

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const body = getBody<RegisterInput>(req);
  const result = await authService.register(body);
  sendCreated(res, result);
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const body = getBody<LoginInput>(req);
  const result = await authService.login(body);
  sendSuccess(res, result);
});

export const getCurrentUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw AppError.unauthorized("Authentication required");
  }

  const user = await authService.getCurrentUser(req.user.id);
  sendSuccess(res, user);
});
