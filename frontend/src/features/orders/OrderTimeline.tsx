import styled from "styled-components";

import { formatDate } from "@/utils/format";
import type { OrderStatus } from "@/types/models";

export interface OrderTimelineProps {
  status: OrderStatus;
  cancelledAt?: string;
}

const TIMELINE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PENDING_PAYMENT", label: "Ödeme Bekleniyor" },
  { status: "PAID", label: "Ödendi" },
  { status: "SHIPPED", label: "Kargoda" },
  { status: "DELIVERED", label: "Teslim Edildi" },
];

// PAYMENT_FAILED, çizelgedeki dört adımdan biri değildir: ödeme adımını henüz
// geçmemiş demektir, bu yüzden "Ödeme Bekleniyor" adımında gösterilir.
function currentStepIndex(status: OrderStatus): number {
  const effectiveStatus = status === "PAYMENT_FAILED" ? "PENDING_PAYMENT" : status;
  return TIMELINE_STEPS.findIndex((step) => step.status === effectiveStatus);
}

const Wrapper = styled.div`
  position: relative;
  display: flex;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.lg} 0;
`;

const Track = styled.div`
  position: absolute;
  top: calc(${({ theme }) => theme.spacing.lg} + 0.875rem);
  left: 0;
  right: 0;
  height: 2px;
  background: ${({ theme }) => theme.colors.border};
`;

const Progress = styled.div<{ $percent: number }>`
  position: absolute;
  top: calc(${({ theme }) => theme.spacing.lg} + 0.875rem);
  left: 0;
  height: 2px;
  background: ${({ theme }) => theme.colors.primary};
  width: ${({ $percent }) => `${$percent}%`};
`;

const StepItem = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  flex: 1;
`;

const StepCircle = styled.div<{ $filled: boolean; $current: boolean }>`
  width: 1.75rem;
  height: 1.75rem;
  border-radius: ${({ theme }) => theme.radii.full};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  background: ${({ theme, $filled }) => ($filled ? theme.colors.primary : theme.colors.surface)};
  border: 2px solid ${({ theme, $filled }) => ($filled ? theme.colors.primary : theme.colors.border)};
  color: ${({ theme, $filled }) => ($filled ? theme.colors.surface : theme.colors.textMuted)};
  box-shadow: ${({ theme, $current }) =>
    $current ? `0 0 0 3px color-mix(in srgb, ${theme.colors.primary} 25%, transparent)` : "none"};
`;

const StepLabel = styled.span<{ $emphasized: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  text-align: center;
  color: ${({ theme, $emphasized }) => ($emphasized ? theme.colors.text : theme.colors.textMuted)};
  font-weight: ${({ theme, $emphasized }) => ($emphasized ? theme.fontWeights.semibold : theme.fontWeights.regular)};
`;

const CancelledWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  text-align: center;
`;

const CancelledTitle = styled.p`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const CancelledDate = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

export default function OrderTimeline({ status, cancelledAt }: OrderTimelineProps) {
  // İptal edilmiş bir sipariş için "hangi adımdayız" sorusunun bir anlamı yok;
  // çizelge yerine doğrudan iptal bilgisi gösterilir.
  if (status === "CANCELLED") {
    return (
      <CancelledWrapper>
        <CancelledTitle>Bu sipariş iptal edildi.</CancelledTitle>
        {cancelledAt && <CancelledDate>İptal tarihi: {formatDate(cancelledAt)}</CancelledDate>}
      </CancelledWrapper>
    );
  }

  const currentIndex = currentStepIndex(status);
  const percent = (currentIndex / (TIMELINE_STEPS.length - 1)) * 100;

  return (
    <Wrapper>
      <Track />
      <Progress $percent={percent} />
      {TIMELINE_STEPS.map((step, index) => (
        <StepItem key={step.status}>
          <StepCircle $filled={index <= currentIndex} $current={index === currentIndex}>
            {index < currentIndex ? "✓" : index + 1}
          </StepCircle>
          <StepLabel $emphasized={index <= currentIndex}>{step.label}</StepLabel>
        </StepItem>
      ))}
    </Wrapper>
  );
}
