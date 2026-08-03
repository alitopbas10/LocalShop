import { Link } from "react-router-dom";
import styled from "styled-components";

import { Button } from "@/components/ui";
import { orderDetail } from "@/routes/paths";
import type { PaymentFailureReason } from "@/types/models";

export interface PaymentFailureScreenProps {
  reason?: PaymentFailureReason;
  orderId: string;
  onRetry: () => void;
}

export const FAILURE_MESSAGES: Record<PaymentFailureReason, string> = {
  CARD_DECLINED: "Kartınız reddedildi.",
  CARD_EXPIRED: "Kartınızın son kullanma tarihi geçmiş.",
  INVALID_CARD_NUMBER: "Kart numarası geçersiz.",
  INSUFFICIENT_FUNDS: "Kartınızda yeterli bakiye yok.",
  PROCESSING_ERROR: "Ödeme işlenirken hata oluştu.",
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.xxl} ${({ theme }) => theme.spacing.lg};
  text-align: center;
`;

const IconCircle = styled.div`
  width: 3.5rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => `color-mix(in srgb, ${theme.colors.danger} 16%, ${theme.colors.surface})`};
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.fontSizes.xxl};
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
`;

const Message = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const CancelLink = styled(Link)`
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

export default function PaymentFailureScreen({ reason, orderId, onRetry }: PaymentFailureScreenProps) {
  return (
    <Wrapper role="alert">
      <IconCircle aria-hidden="true">✕</IconCircle>
      <Title>Ödeme Başarısız</Title>
      <Message>{reason ? FAILURE_MESSAGES[reason] : "Ödeme gerçekleştirilemedi."}</Message>
      <Actions>
        <Button type="button" onClick={onRetry}>
          Tekrar Dene
        </Button>
        <CancelLink to={orderDetail(orderId)}>Siparişi İptal Et</CancelLink>
      </Actions>
    </Wrapper>
  );
}
