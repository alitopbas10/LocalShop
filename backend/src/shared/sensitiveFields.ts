// Bu listedeki alan adlarının HİÇBİRİ herhangi bir API response'unda bulunmamalıdır.
// Bir sonraki adımdaki denetim script'i (response body'lerini bu listeye karşı tarayan)
// bu diziyi kullanır.
export const SENSITIVE_FIELDS = [
  "password",
  "cardNumber",
  "cvv",
  "expiry",
  "__v",
  "idempotencyKey",
] as const;

export type SensitiveField = (typeof SENSITIVE_FIELDS)[number];
