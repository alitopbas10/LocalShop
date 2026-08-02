// Bu dosyadaki hiçbir fonksiyon kart numarasını, CVV'yi veya son kullanma tarihini
// console'a, log'a veya herhangi bir kalıcı depoya yazmaz. Hata durumlarında bile ham kart
// verisi dışarı çıkmaz.

export type CardBrand = "VISA" | "MASTERCARD" | "AMEX" | "TROY" | "UNKNOWN";

export function normalizeCardNumber(input: string): string {
  return input.replace(/[\s-]/g, "").replace(/\D/g, "");
}

export function isValidLuhn(cardNumber: string): boolean {
  let sum = 0;
  let shouldDouble = false;

  for (let i = cardNumber.length - 1; i >= 0; i -= 1) {
    let digit = Number(cardNumber[i]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

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

  if (
    (firstTwo >= 51 && firstTwo <= 55) ||
    (firstFour >= 2221 && firstFour <= 2720)
  ) {
    return "MASTERCARD";
  }

  return "UNKNOWN";
}

export function getLast4(cardNumber: string): string {
  return cardNumber.slice(-4);
}

export function maskCardNumber(cardNumber: string): string {
  return `**** **** **** ${getLast4(cardNumber)}`;
}

export function isExpiryValid(expiry: string): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!match) {
    return false;
  }

  const month = Number(match[1]);
  const year = Number(match[2]);

  if (month < 1 || month > 12) {
    return false;
  }

  // Yüzyıl varsayımı: "YY" her zaman 2000'ler olarak yorumlanır (bu proje bağlamında
  // 1900'lerden bir kart geçerlilik tarihi anlamsızdır).
  const fullYear = 2000 + year;

  // Ayın SON gününe kadar geçerli: bir sonraki ayın 0. günü, bu ayın son günüdür.
  const expiryEnd = new Date(fullYear, month, 0, 23, 59, 59, 999);

  return expiryEnd.getTime() >= Date.now();
}
