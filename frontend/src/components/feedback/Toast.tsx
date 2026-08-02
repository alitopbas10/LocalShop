import styled from "styled-components";

import type { ToastItem, ToastType } from "@/context/ToastContext";
import type { Theme } from "@/styles/theme";

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const VARIANT_COLOR: Record<ToastType, (theme: Theme) => string> = {
  success: (theme) => theme.colors.success,
  error: (theme) => theme.colors.danger,
  info: (theme) => theme.colors.info,
};

const Viewport = styled.div`
  position: fixed;
  bottom: ${({ theme }) => theme.spacing.lg};
  right: ${({ theme }) => theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  z-index: 200;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    left: ${({ theme }) => theme.spacing.md};
    right: ${({ theme }) => theme.spacing.md};
    bottom: ${({ theme }) => theme.spacing.md};
  }
`;

const ToastCard = styled.div<{ $type: ToastType }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.sm};
  max-width: 22rem;
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadows.md};
  background: ${({ theme }) => theme.colors.surface};
  border-left: 4px solid ${({ theme, $type }) => VARIANT_COLOR[$type](theme)};
  color: ${({ theme }) => theme.colors.text};
`;

const Message = styled.p`
  flex: 1;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.md};
  line-height: 1;
  padding: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

export default function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <Viewport role="region" aria-label="Bildirimler">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} $type={toast.type} role="status">
          <Message>{toast.message}</Message>
          <CloseButton
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Bildirimi kapat"
          >
            ✕
          </CloseButton>
        </ToastCard>
      ))}
    </Viewport>
  );
}
