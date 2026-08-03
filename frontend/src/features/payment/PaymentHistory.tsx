import styled from "styled-components";

import { Badge } from "@/components/ui";
import { FAILURE_MESSAGES } from "@/features/payment/PaymentFailureScreen";
import { useApi } from "@/hooks/useApi";
import * as paymentService from "@/services/paymentService";
import { formatDate } from "@/utils/format";

export interface PaymentHistoryProps {
  orderId: string;
}

const Section = styled.section`
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

// Gerçek bir <table> masaüstünde, kart listesi mobilde (bkz. SellerProductListPage.tsx
// / OrderItemsTable.tsx'teki aynı desen): iki ayrı markup, CSS ile hangisi görünecek seçilir.
const TableWrapper = styled.div`
  display: none;
  overflow-x: auto;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: block;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Th = styled.th`
  text-align: left;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
`;

const Td = styled.td`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;

  &:last-child {
    white-space: normal;
  }
`;

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none;
  }
`;

const PaymentCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const PaymentCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const PaymentCardMeta = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const PaymentCardReason = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const InfoText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

export default function PaymentHistory({ orderId }: PaymentHistoryProps) {
  const { data: payments, error, isLoading } = useApi(() => paymentService.getOrderPayments(orderId), [orderId]);

  if (isLoading) {
    return null;
  }

  if (error) {
    return (
      <Section>
        <SectionTitle>Ödeme Geçmişi</SectionTitle>
        <InfoText>Ödeme geçmişi yüklenemedi.</InfoText>
      </Section>
    );
  }

  // "varsa listele": hiç deneme yoksa bu bölüm hiç gösterilmez, boş bir tablo ya da
  // EmptyState gösterip sayfayı gereksiz uzatmaz.
  if (!payments || payments.length === 0) {
    return null;
  }

  return (
    <Section>
      <SectionTitle>Ödeme Geçmişi</SectionTitle>
      <TableWrapper>
        <Table>
          <thead>
            <tr>
              <Th>Tarih</Th>
              <Th>Kart</Th>
              <Th>Sonuç</Th>
              <Th>Sebep</Th>
            </tr>
          </thead>
          <tbody>
            {payments.map((paymentAttempt) => (
              <tr key={paymentAttempt._id}>
                <Td>{formatDate(paymentAttempt.createdAt)}</Td>
                <Td>
                  {paymentAttempt.cardBrand} •••• {paymentAttempt.cardLast4}
                </Td>
                <Td>
                  <Badge variant={paymentAttempt.status === "SUCCEEDED" ? "success" : "danger"}>
                    {paymentAttempt.status === "SUCCEEDED" ? "Başarılı" : "Başarısız"}
                  </Badge>
                </Td>
                <Td>{paymentAttempt.failureReason ? FAILURE_MESSAGES[paymentAttempt.failureReason] : "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrapper>

      <CardList>
        {payments.map((paymentAttempt) => (
          <PaymentCard key={paymentAttempt._id}>
            <PaymentCardHeader>
              <PaymentCardMeta>
                {paymentAttempt.cardBrand} •••• {paymentAttempt.cardLast4}
              </PaymentCardMeta>
              <Badge variant={paymentAttempt.status === "SUCCEEDED" ? "success" : "danger"}>
                {paymentAttempt.status === "SUCCEEDED" ? "Başarılı" : "Başarısız"}
              </Badge>
            </PaymentCardHeader>
            <PaymentCardMeta>{formatDate(paymentAttempt.createdAt)}</PaymentCardMeta>
            {paymentAttempt.failureReason && (
              <PaymentCardReason>{FAILURE_MESSAGES[paymentAttempt.failureReason]}</PaymentCardReason>
            )}
          </PaymentCard>
        ))}
      </CardList>
    </Section>
  );
}
