// Bu fonksiyon kart verisini ALIR ama HİÇBİR YERE YAZMAZ. Log, konsol, dosya, veritabanı —
// hiçbiri. Dönüş değerinde yalnızca son 4 hane ve marka bulunur. Bu dosyaya log eklemek
// isteyen herkes önce bu yorumu okumalı.
//
// Bu katman simüle edilmiş bir ödeme sağlayıcısıdır; gerçek bir sağlayıcının (ör. Stripe,
// iyzico) yerini tutacak şekilde tasarlanmıştır. İleride gerçek entegrasyona geçilirken
// yalnızca bu dosyanın içeriği değişir, çağıran taraf etkilenmez — bu yüzden charge()
// dışında hiçbir iç detay (tipler dahil) dışarı sızdırılmaz.
import { randomBytes } from "node:crypto";

import { normalizeCardNumber, isValidLuhn, detectCardBrand, getLast4, isExpiryValid } from "@/modules/payment/card.utils";
import type { PaymentFailureReason } from "@/modules/payment/payment.types";

type ChargeRequest = {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
  amount: number;
};

type ChargeResult =
  | { status: "SUCCEEDED"; transactionId: string; cardLast4: string; cardBrand: string }
  | {
      status: "FAILED";
      transactionId: string;
      cardLast4: string;
      cardBrand: string;
      failureReason: PaymentFailureReason;
    };

export const TEST_CARDS = {
  SUCCESS: "4242424242424242",
  DECLINE: "4000000000000000",
} as const;

const MIN_DELAY_MS = 300;
const MAX_DELAY_MS = 800;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function randomDelayMs(): number {
  return MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1));
}

function generateTransactionId(): string {
  return `FP-${randomBytes(6).toString("hex")}`;
}

export async function charge(request: ChargeRequest): Promise<ChargeResult> {
  await wait(randomDelayMs());

  const cardNumber = normalizeCardNumber(request.cardNumber);
  const cardLast4 = getLast4(cardNumber);
  const cardBrand = detectCardBrand(cardNumber);
  const transactionId = generateTransactionId();

  const fail = (failureReason: PaymentFailureReason): ChargeResult => ({
    status: "FAILED",
    transactionId,
    cardLast4,
    cardBrand,
    failureReason,
  });

  if (!isExpiryValid(request.expiry)) {
    return fail("CARD_EXPIRED");
  }

  // Test kartları Luhn kontrolünden ÖNCE ele alınır: case study'nin başarısız ödeme
  // senaryosunu temsil eden 4000000000000000 aslında Luhn kontrolünden geçmez. Luhn önce
  // çalıştırılsaydı bu kart INVALID_CARD_NUMBER ile reddedilirdi; case study ise bu kartın
  // "geçerli ama banka tarafından reddedilen kart" (CARD_DECLINED) senaryosunu temsil
  // etmesini istiyor. Test kartlarını Luhn'dan önce kontrol ederek istenen davranış korunur.
  if (cardNumber === TEST_CARDS.SUCCESS) {
    return { status: "SUCCEEDED", transactionId, cardLast4, cardBrand };
  }

  if (cardNumber === TEST_CARDS.DECLINE) {
    return fail("CARD_DECLINED");
  }

  if (!isValidLuhn(cardNumber)) {
    return fail("INVALID_CARD_NUMBER");
  }

  // Simülasyonda yalnızca tanımlı test kartları başarılı olur.
  return fail("CARD_DECLINED");
}
