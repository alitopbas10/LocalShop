// Backend zarf tipleri. Kaynak: backend/src/shared/apiResponse.ts, backend/src/shared/errorCodes.ts

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "TOKEN_EXPIRED"
  | "TOKEN_INVALID"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "DUPLICATE_RESOURCE"
  | "INSUFFICIENT_STOCK"
  | "INVALID_STATE_TRANSITION"
  | "RATE_LIMIT_EXCEEDED"
  | "PAYLOAD_TOO_LARGE"
  | "INTERNAL_ERROR";

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  error: {
    message: string;
    code: ErrorCode;
    details?: unknown;
    stack?: string;
    requestId?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

// sendSuccess çağrılarında meta hep { total, page, limit, totalPages } şeklinde geçiliyor
// (bkz. product/order/catalog controller'ları); backend başka şekilde bir meta döndürmüyor.
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
