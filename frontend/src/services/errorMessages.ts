import { ApiError, type ApiErrorCode } from "@/services/apiError";

export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  INVALID_CREDENTIALS: "E-posta veya şifre hatalı.",
  VALIDATION_ERROR: "Girdiğiniz bilgilerde hata var.",
  UNAUTHORIZED: "Bu işlem için giriş yapmalısınız.",
  TOKEN_EXPIRED: "Oturumunuz sona erdi, lütfen tekrar giriş yapın.",
  TOKEN_INVALID: "Oturumunuz geçersiz, lütfen tekrar giriş yapın.",
  FORBIDDEN: "Bu işlem için yetkiniz yok.",
  NOT_FOUND: "Aradığınız kayıt bulunamadı.",
  DUPLICATE_RESOURCE: "Bu kayıt zaten mevcut.",
  INSUFFICIENT_STOCK: "Yeterli stok yok.",
  INVALID_STATE_TRANSITION: "Bu işlem mevcut durumda yapılamaz.",
  RATE_LIMIT_EXCEEDED: "Çok fazla deneme yaptınız, lütfen biraz bekleyin.",
  PAYLOAD_TOO_LARGE: "Gönderilen veri çok büyük.",
  INTERNAL_ERROR: "Beklenmeyen bir hata oluştu.",
  NETWORK_ERROR: "Sunucuya ulaşılamıyor. Bağlantınızı kontrol edin.",
  UNKNOWN: "Beklenmeyen bir hata oluştu.",
};

interface FieldError {
  field: string;
  message: string;
}

function isFieldErrorArray(details: unknown): details is FieldError[] {
  return (
    Array.isArray(details) &&
    details.every(
      (item): item is FieldError =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).field === "string" &&
        typeof (item as Record<string, unknown>).message === "string",
    )
  );
}

// VALIDATION_ERROR için details'teki ilk alan hatası genel mesajdan daha spesifiktir
// (ör. "email: Invalid email format"), o yüzden mevcutsa tercih edilir.
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "VALIDATION_ERROR" && isFieldErrorArray(error.details)) {
      const [firstIssue] = error.details;
      if (firstIssue) {
        return `${firstIssue.field}: ${firstIssue.message}`;
      }
    }
    return ERROR_MESSAGES[error.code];
  }

  return ERROR_MESSAGES.UNKNOWN;
}
