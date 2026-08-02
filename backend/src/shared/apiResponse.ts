import type { Response } from "express";
import { httpStatus } from "@/shared/httpStatus";
import type { ErrorCode } from "@/shared/errorCodes";

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiFailure = {
  success: false;
  error: {
    message: string;
    code: ErrorCode;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = httpStatus.OK,
  meta?: Record<string, unknown>,
): Response<ApiSuccess<T>> {
  const body: ApiSuccess<T> = meta === undefined ? { success: true, data } : { success: true, data, meta };
  return res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T): Response<ApiSuccess<T>> {
  return sendSuccess(res, data, httpStatus.CREATED);
}
