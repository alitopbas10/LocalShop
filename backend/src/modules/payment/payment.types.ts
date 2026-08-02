export const PAYMENT_STATUSES = ["SUCCEEDED", "FAILED"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_FAILURE_REASONS = [
  "CARD_DECLINED",
  "INVALID_CARD_NUMBER",
  "CARD_EXPIRED",
  "INSUFFICIENT_FUNDS",
  "PROCESSING_ERROR",
] as const;

export type PaymentFailureReason = (typeof PAYMENT_FAILURE_REASONS)[number];
