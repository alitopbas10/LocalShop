import type { AxiosError } from "axios";

import type { ApiFailure, ErrorCode } from "@/types/api";

export type ApiErrorCode = ErrorCode | "NETWORK_ERROR" | "UNKNOWN";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number | null;
  readonly details: unknown;
  readonly requestId: string | null;

  constructor(
    message: string,
    code: ApiErrorCode,
    status: number | null,
    details: unknown = undefined,
    requestId: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }

  isNetworkError(): boolean {
    return this.code === "NETWORK_ERROR";
  }

  static fromAxiosError(error: AxiosError<ApiFailure>): ApiError {
    const response = error.response;

    if (!response) {
      return new ApiError(
        "Sunucuya ulaşılamıyor. Bağlantınızı kontrol edin.",
        "NETWORK_ERROR",
        null,
      );
    }

    const body = response.data;
    if (body && body.success === false) {
      return new ApiError(
        body.error.message,
        body.error.code,
        response.status,
        body.error.details,
        body.error.requestId ?? null,
      );
    }

    return new ApiError("Beklenmeyen bir hata oluştu.", "UNKNOWN", response.status);
  }
}
