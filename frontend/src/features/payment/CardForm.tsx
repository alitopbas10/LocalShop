import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import styled from "styled-components";

import { Badge, Button, ErrorState, Input } from "@/components/ui";
import { CARD_BRAND_LABELS, detectCardBrand } from "@/features/payment/cardBrand";
import PaymentFailureScreen from "@/features/payment/PaymentFailureScreen";
import PaymentSuccessScreen from "@/features/payment/PaymentSuccessScreen";
import { useMutation } from "@/hooks/useMutation";
import * as paymentService from "@/services/paymentService";
import type { PayInput } from "@/services/paymentService";
import type { Order, PayOrderResult } from "@/types/models";

// Kart bilgileri (numara, isim, son kullanma, CVV) yalnızca bu bileşenin form state'inde
// tutulur: localStorage/sessionStorage'a yazılmaz, URL'e (query/param) konmaz, hiçbir
// console.log/console.error çağrısına verilmez. Başarılı ödemeden sonra form state'i
// sıfırlanır (bkz. handleSubmit) — bilerek, kart verisinin ekranda gereğinden uzun
// kalmaması için.
export interface CardFormProps {
  order: Order;
  onAttemptRecorded: (result: PayOrderResult) => void;
}

const MAX_CARD_DIGITS = 19;

interface FormState {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
}

const EMPTY_FORM: FormState = { cardNumber: "", cardHolder: "", expiry: "", cvv: "" };

function formatCardNumber(digitsOnly: string): string {
  return digitsOnly.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(digitsOnly: string): string {
  return digitsOnly.length > 2 ? `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}` : digitsOnly;
}

// Gelecekte kalması için gün/ay'dan bağımsız, her zaman geçerli bir tarih hesaplanır —
// sabit bir yıl yazılsaydı (ör. "12/27") test kutusu birkaç yıl sonra geçersiz bir kart
// önerirdi.
function buildFutureTestExpiry(): string {
  const futureYear = (new Date().getFullYear() + 3) % 100;
  return `12/${String(futureYear).padStart(2, "0")}`;
}

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
  margin-top: ${({ theme }) => theme.spacing.lg};

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: row;
    align-items: flex-start;
  }
`;

const FormPanel = styled.form`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const CardNumberRow = styled.div`
  position: relative;
`;

const BrandBadgeSlot = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.spacing.xs};
  right: ${({ theme }) => theme.spacing.sm};
`;

const Row = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const SecurityNote = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const TestCardBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.background};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 260px;
    flex-shrink: 0;
  }
`;

const TestCardTitle = styled.p`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const TestCardRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const TestCardLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const TestCardNumber = styled.code`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text};
`;

const TestCardHint = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

export default function CardForm({ order, onAttemptRecorded }: CardFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [attempt, setAttempt] = useState<PayOrderResult | null>(null);

  // Aynı ödeme denemesi (çift tıklama, ağ zaman aşımı sonrası otomatik yeniden deneme)
  // her zaman AYNI anahtarla gitmeli ki backend onu ilk denemenin bir kopyası sayıp
  // kartı ikinci kez çekmesin. useRef bilinçli seçildi: değeri render'lar arasında
  // sabit kalır ve değişmesi (retry hariç) bileşeni yeniden render ETMEZ. useState
  // kullanılsaydı her render'da (ör. başka bir state güncellemesiyle tetiklenen bir
  // render'da) yanlışlıkla yeni bir anahtar üretme riski doğar; burada da olduğu gibi
  // "if (ref.current === undefined)" koruması olmadan bu risk gerçek olurdu. Anahtar,
  // yalnızca BAŞARISIZ bir denemeden sonra kullanıcı "Tekrar Dene" dediğinde bilinçli
  // olarak yenilenir (handleRetry) — başarısız bir deneme tekrar edilebilir olmalı.
  const idempotencyKeyRef = useRef<string | undefined>(undefined);
  if (idempotencyKeyRef.current === undefined) {
    idempotencyKeyRef.current = crypto.randomUUID();
  }

  const { mutate: submitPayment, isLoading: isSubmitting, error, reset } = useMutation(paymentService.pay);

  function handleCardNumberChange(event: ChangeEvent<HTMLInputElement>) {
    const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, MAX_CARD_DIGITS);
    setForm((prev) => ({ ...prev, cardNumber: formatCardNumber(digitsOnly) }));
  }

  function handleCardHolderChange(event: ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, cardHolder: event.target.value.toUpperCase() }));
  }

  function handleExpiryChange(event: ChangeEvent<HTMLInputElement>) {
    const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 4);
    setForm((prev) => ({ ...prev, expiry: formatExpiry(digitsOnly) }));
  }

  function handleCvvChange(event: ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, cvv: event.target.value.replace(/\D/g, "").slice(0, 4) }));
  }

  function fillTestCard(cardNumber: string) {
    setForm({
      cardNumber: formatCardNumber(cardNumber),
      cardHolder: "TEST KULLANICI",
      expiry: buildFutureTestExpiry(),
      cvv: "123",
    });
  }

  function handleRetry() {
    idempotencyKeyRef.current = crypto.randomUUID();
    setAttempt(null);
    reset();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input: PayInput = {
      orderId: order._id,
      cardNumber: form.cardNumber.replace(/\s/g, ""),
      cardHolder: form.cardHolder,
      expiry: form.expiry,
      cvv: form.cvv,
    };

    try {
      const result = await submitPayment(input, idempotencyKeyRef.current);
      setAttempt(result);
      onAttemptRecorded(result);

      if (result.payment.status === "SUCCEEDED") {
        // Kart bilgileri zaten form state'i dışında hiçbir yerde tutulmuyordu; başarılı
        // ödemeden sonra bu state de temizlenir, ekranda veya bellekte kalmasın.
        setForm(EMPTY_FORM);
      }
    } catch {
      // HTTP hatası (4xx/5xx): useMutation'ın error state'i üzerinden aşağıda ErrorState
      // render edilir, burada ayrıca bir şey yapmaya gerek yok.
    }
  }

  if (attempt?.payment.status === "SUCCEEDED") {
    return <PaymentSuccessScreen orderNumber={attempt.order.orderNumber} />;
  }

  if (attempt?.payment.status === "FAILED") {
    return (
      <PaymentFailureScreen reason={attempt.payment.failureReason} orderId={order._id} onRetry={handleRetry} />
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={reset} />;
  }

  const cardDigits = form.cardNumber.replace(/\s/g, "");
  const brand = detectCardBrand(cardDigits);

  return (
    <Layout>
      <FormPanel onSubmit={handleSubmit}>
        <CardNumberRow>
          <Input
            label="Kart Numarası"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4242 4242 4242 4242"
            value={form.cardNumber}
            onChange={handleCardNumberChange}
            required
          />
          {brand !== "UNKNOWN" && (
            <BrandBadgeSlot>
              <Badge variant="info">{CARD_BRAND_LABELS[brand]}</Badge>
            </BrandBadgeSlot>
          )}
        </CardNumberRow>

        <Input
          label="Kart Üzerindeki İsim"
          autoComplete="cc-name"
          placeholder="AD SOYAD"
          value={form.cardHolder}
          onChange={handleCardHolderChange}
          required
        />

        <Row>
          <Input
            label="Son Kullanma Tarihi"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            value={form.expiry}
            onChange={handleExpiryChange}
            required
          />
          <Input
            label="CVV"
            type="password"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            value={form.cvv}
            onChange={handleCvvChange}
            required
          />
        </Row>

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "İşleniyor..." : "Ödemeyi Tamamla"}
        </Button>

        <SecurityNote>
          Kart bilgileriniz yalnızca bu ödeme isteği için kullanılır; tarayıcınızda hiçbir
          yerde (yerel depolama, oturum depolama, adres çubuğu) saklanmaz.
        </SecurityNote>
      </FormPanel>

      <TestCardBox>
        <TestCardTitle>Test Kartları</TestCardTitle>

        <TestCardRow>
          <TestCardLabel>Başarılı ödeme</TestCardLabel>
          <TestCardNumber>4242 4242 4242 4242</TestCardNumber>
          <Button type="button" variant="secondary" size="sm" onClick={() => fillTestCard("4242424242424242")}>
            Bu kartla doldur
          </Button>
        </TestCardRow>

        <TestCardRow>
          <TestCardLabel>Başarısız ödeme</TestCardLabel>
          <TestCardNumber>4000 0000 0000 0000</TestCardNumber>
          <Button type="button" variant="secondary" size="sm" onClick={() => fillTestCard("4000000000000000")}>
            Bu kartla doldur
          </Button>
        </TestCardRow>

        <TestCardHint>Son kullanma: gelecekteki herhangi bir tarih. CVV: herhangi 3 hane.</TestCardHint>
      </TestCardBox>
    </Layout>
  );
}
