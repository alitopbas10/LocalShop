import { ApiError } from "@/services/apiError";

interface FieldErrorDetail {
  field: string;
  message: string;
}

function isFieldErrorDetail(value: unknown): value is FieldErrorDetail {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).field === "string" &&
    typeof (value as Record<string, unknown>).message === "string"
  );
}

// VALIDATION_ERROR dışındaki hatalar alan bazlı değildir (ör. DUPLICATE_RESOURCE), bu
// yüzden formun üstünde genel bir banner ile gösterilmesi gerekir; sadece VALIDATION_ERROR
// details dizisi doğrudan bir input'a eşlenebilir.
export function mapFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.code !== "VALIDATION_ERROR") {
    return {};
  }

  if (!Array.isArray(error.details)) {
    return {};
  }

  const fieldErrors: Record<string, string> = {};
  for (const detail of error.details) {
    if (isFieldErrorDetail(detail) && !(detail.field in fieldErrors)) {
      fieldErrors[detail.field] = detail.message;
    }
  }
  return fieldErrors;
}
