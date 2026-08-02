import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";

import { isDev, isProd } from "@/config/env";
import { AppError } from "@/shared/AppError";
import type { ApiFailure } from "@/shared/apiResponse";
import { errorCodes, type ErrorCode } from "@/shared/errorCodes";
import { httpStatus } from "@/shared/httpStatus";

type FieldError = { field: string; message: string };

type ResolvedError = {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
};

// jsonwebtoken henüz kurulu değil (Faz 2); instanceof yerine name kontrolü kullanıyoruz
// ki paket eklendiğinde de bu kontrol değişmeden çalışmaya devam etsin.
function isJwtError(
  err: unknown,
): err is Error & { name: "JsonWebTokenError" | "TokenExpiredError" } {
  return (
    err instanceof Error && (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError")
  );
}

function extractDuplicateField(err: mongoose.mongo.MongoServerError): string {
  const keyValue: unknown = err.keyValue;
  if (keyValue && typeof keyValue === "object") {
    const [field] = Object.keys(keyValue as Record<string, unknown>);
    if (field) {
      return field;
    }
  }
  return "field";
}

function resolveError(err: unknown): ResolvedError {
  if (err instanceof ZodError) {
    const details: FieldError[] = err.issues.map((issue) => ({
      field: issue.path.map(String).join(".") || "root",
      message: issue.message,
    }));
    return {
      statusCode: httpStatus.BAD_REQUEST,
      code: errorCodes.VALIDATION_ERROR,
      message: "Validation failed",
      details,
    };
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details: FieldError[] = Object.values(err.errors).map((fieldError) => ({
      field: fieldError.path,
      message: fieldError.message,
    }));
    return {
      statusCode: httpStatus.BAD_REQUEST,
      code: errorCodes.VALIDATION_ERROR,
      message: "Validation failed",
      details,
    };
  }

  if (err instanceof mongoose.Error.CastError) {
    return {
      statusCode: httpStatus.BAD_REQUEST,
      code: errorCodes.VALIDATION_ERROR,
      message: "Invalid ID format",
    };
  }

  // duplicate key hatasında sadece alan adı mesaja yazılır; değeri yazmak
  // kayıt ekranında user enumeration açığına yol açar
  if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
    const field = extractDuplicateField(err);
    return {
      statusCode: httpStatus.CONFLICT,
      code: errorCodes.DUPLICATE_RESOURCE,
      message: `${field} is already in use`,
    };
  }

  if (isJwtError(err)) {
    if (err.name === "TokenExpiredError") {
      return {
        statusCode: httpStatus.UNAUTHORIZED,
        code: errorCodes.TOKEN_EXPIRED,
        message: "Token expired",
      };
    }
    return {
      statusCode: httpStatus.UNAUTHORIZED,
      code: errorCodes.TOKEN_INVALID,
      message: "Invalid token",
    };
  }

  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      details: err.details,
    };
  }

  // orijinal hata mesajı client'a asla sızdırılmaz
  return {
    statusCode: httpStatus.INTERNAL_SERVER_ERROR,
    code: errorCodes.INTERNAL_ERROR,
    message: "Something went wrong",
  };
}

function logError(err: unknown, req: Request, statusCode: number): void {
  const line = `${req.method} ${req.originalUrl} ${statusCode}`;

  if (statusCode >= 500) {
    console.error(line, err);
    return;
  }

  if (!isProd) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn(line, message);
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  const resolved = resolveError(err);
  logError(err, req, resolved.statusCode);

  const body: ApiFailure & { stack?: string } = {
    success: false,
    error: {
      message: resolved.message,
      code: resolved.code,
      ...(resolved.details !== undefined ? { details: resolved.details } : {}),
    },
  };

  if (isDev && err instanceof Error && err.stack) {
    body.stack = err.stack;
  }

  res.status(resolved.statusCode).json(body);
}
