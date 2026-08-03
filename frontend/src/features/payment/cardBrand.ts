export type CardBrand = "VISA" | "MASTERCARD" | "AMEX" | "TROY" | "UNKNOWN";

// Backend'deki marka tespit mantığının (card.utils.ts) birebir frontend kopyasıdır —
// sadece kullanıcıya kartını tanıdığımızı gösteren küçük bir rozet içindir. Kabul/red
// kararını hiç etkilemez; asıl karar (Luhn + test kartları) her zaman backend'de verilir.
export function detectCardBrand(cardNumber: string): CardBrand {
  if (cardNumber.startsWith("9792")) {
    return "TROY";
  }

  if (cardNumber.startsWith("4")) {
    return "VISA";
  }

  if (cardNumber.startsWith("34") || cardNumber.startsWith("37")) {
    return "AMEX";
  }

  const firstTwo = Number(cardNumber.slice(0, 2));
  const firstFour = Number(cardNumber.slice(0, 4));

  if ((firstTwo >= 51 && firstTwo <= 55) || (firstFour >= 2221 && firstFour <= 2720)) {
    return "MASTERCARD";
  }

  return "UNKNOWN";
}

export const CARD_BRAND_LABELS: Record<CardBrand, string> = {
  VISA: "VISA",
  MASTERCARD: "MASTERCARD",
  AMEX: "AMEX",
  TROY: "TROY",
  UNKNOWN: "",
};
