import axios, { type AxiosRequestConfig } from "axios";

import { ApiError } from "@/services/apiError";
import { clearToken, getToken } from "@/services/tokenStorage";
import type { ApiFailure, ApiResponse, PaginationMeta } from "@/types/api";

// login/register denemesinde 401 almak normaldir (yanlış şifre); bu isteklerde otomatik
// çıkış tetiklenmemeli, sadece geçerli bir oturumu olan kullanıcı için token geçersizleştiğinde
// tetiklenmeli.
const AUTH_EXEMPT_PATHS = ["/auth/login", "/auth/register"];

// apiClient'ın router'a doğrudan bağımlı olmasını istemiyoruz (döngüsel bağımlılık ve test
// edilebilirlik sorunu); AuthContext bu handler'ı kendi çıkış mantığıyla bağlar.
type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

function isAuthExemptRequest(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  return AUTH_EXEMPT_PATHS.some((path) => url.includes(path));
}

export const apiClient = axios.create({
  baseURL: "/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError<ApiFailure>(error)) {
      return Promise.reject(new ApiError("Beklenmeyen bir hata oluştu.", "UNKNOWN", null));
    }

    const hadToken = getToken() !== null;
    const isExempt = isAuthExemptRequest(error.config?.url);
    if (error.response?.status === 401 && hadToken && !isExempt) {
      clearToken();
      unauthorizedHandler?.();
    }

    return Promise.reject(ApiError.fromAxiosError(error));
  },
);

interface UnwrappedResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

// 2xx yanıtta backend her zaman { success: true, ... } döner (bkz. sendSuccess/sendCreated);
// success: false yalnızca hata durumunda ve non-2xx status ile gelir, o da response
// interceptor'ında zaten ApiError'a çevrilip reddedilir. Bu yüzden burada success daraltması
// güvenlidir.
function unwrap<T>(body: ApiResponse<T>): UnwrappedResponse<T> {
  if (!body.success) {
    throw new ApiError(body.error.message, body.error.code, null, body.error.details, body.error.requestId ?? null);
  }
  return { data: body.data, meta: body.meta as PaginationMeta | undefined };
}

export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<UnwrappedResponse<T>> {
  const response = await apiClient.get<ApiResponse<T>>(url, config);
  return unwrap(response.data);
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<UnwrappedResponse<T>> {
  const response = await apiClient.post<ApiResponse<T>>(url, body, config);
  return unwrap(response.data);
}

export async function apiPatch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<UnwrappedResponse<T>> {
  const response = await apiClient.patch<ApiResponse<T>>(url, body, config);
  return unwrap(response.data);
}

export async function apiDelete<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<UnwrappedResponse<T>> {
  const response = await apiClient.delete<ApiResponse<T>>(url, config);
  return unwrap(response.data);
}

// Sayfalanmış liste endpoint'leri meta'yı her zaman gönderir (bkz. controller'lardaki
// sendSuccess(res, items, 200, { total, page, limit, totalPages }) çağrıları); bu yardımcı
// o garantiyi tip seviyesine taşır, çağıran taraf her seferinde "meta yoksa" dalı yazmaz.
export function assertMeta(meta: PaginationMeta | undefined): PaginationMeta {
  if (!meta) {
    throw new Error("Expected pagination meta in list response");
  }
  return meta;
}
