import { httpStatus } from "@/shared/httpStatus";
import { errorCodes, type ErrorCode } from "@/shared/errorCodes";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: ErrorCode, details?: unknown) {
    super(message);

    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    // Error alt sınıflarında instanceof kontrolünün doğru çalışması için gerekli
    Object.setPrototypeOf(this, AppError.prototype);

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, httpStatus.BAD_REQUEST, errorCodes.VALIDATION_ERROR, details);
  }

  static unauthorized(message = "Unauthorized"): AppError {
    return new AppError(message, httpStatus.UNAUTHORIZED, errorCodes.UNAUTHORIZED);
  }

  static forbidden(message = "Forbidden"): AppError {
    return new AppError(message, httpStatus.FORBIDDEN, errorCodes.FORBIDDEN);
  }

  static notFound(resource = "Resource"): AppError {
    return new AppError(`${resource} not found`, httpStatus.NOT_FOUND, errorCodes.NOT_FOUND);
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError(message, httpStatus.CONFLICT, errorCodes.DUPLICATE_RESOURCE, details);
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError(
      message,
      httpStatus.UNPROCESSABLE_ENTITY,
      errorCodes.VALIDATION_ERROR,
      details,
    );
  }

  static internal(message = "Internal server error"): AppError {
    return new AppError(message, httpStatus.INTERNAL_SERVER_ERROR, errorCodes.INTERNAL_ERROR);
  }
}
