import type { ButtonHTMLAttributes } from "react";
import styled, { css } from "styled-components";

import Spinner from "@/components/ui/Spinner";
import type { Theme } from "@/styles/theme";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

function sizeStyles(theme: Theme, size: ButtonSize) {
  const sizes: Record<ButtonSize, ReturnType<typeof css>> = {
    sm: css`
      padding: ${theme.spacing.xs} ${theme.spacing.md};
      font-size: ${theme.fontSizes.sm};
    `,
    md: css`
      padding: ${theme.spacing.sm} ${theme.spacing.lg};
      font-size: ${theme.fontSizes.md};
    `,
    lg: css`
      padding: ${theme.spacing.md} ${theme.spacing.xl};
      font-size: ${theme.fontSizes.lg};
    `,
  };
  return sizes[size];
}

// Birincil renk yalnızca ana aksiyon butonuna ayrılır: "primary" varyantı dışındakiler
// nötr yüzeyler kullanır ki sayfada her yere serpiştirilmiş bir yeşil görünüm oluşmasın.
function variantStyles(theme: Theme, variant: ButtonVariant) {
  const variants: Record<ButtonVariant, ReturnType<typeof css>> = {
    primary: css`
      background: ${theme.colors.primary};
      border-color: ${theme.colors.primary};
      color: ${theme.colors.surface};

      &:hover:not(:disabled) {
        background: ${theme.colors.primaryDark};
        border-color: ${theme.colors.primaryDark};
      }
    `,
    secondary: css`
      background: ${theme.colors.surface};
      border-color: ${theme.colors.border};
      color: ${theme.colors.text};

      &:hover:not(:disabled) {
        background: ${theme.colors.background};
      }
    `,
    danger: css`
      background: ${theme.colors.danger};
      border-color: ${theme.colors.danger};
      color: ${theme.colors.surface};

      &:hover:not(:disabled) {
        filter: brightness(0.92);
      }
    `,
    ghost: css`
      background: transparent;
      border-color: transparent;
      color: ${theme.colors.text};

      &:hover:not(:disabled) {
        background: ${theme.colors.background};
      }
    `,
  };
  return variants[variant];
}

const StyledButton = styled.button<{
  $variant: ButtonVariant;
  $size: ButtonSize;
  $fullWidth: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "auto")};
  /* Dokunma hedefi en az 44x44px olsun diye: küçük varyantların (sm) padding'i tek
     başına bunu karşılamıyor, min-height boyut farkı görsel kalsın diye tüm boyutlara
     tek satırda uygulanır. */
  min-height: 2.75rem;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radii.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    opacity 0.15s ease;

  ${({ theme, $size }) => sizeStyles(theme, $size)}
  ${({ theme, $variant }) => variantStyles(theme, $variant)}

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

// isLoading true iken buton disabled olur: ödeme gibi kritik akışlarda kullanıcının
// çift tıklayıp aynı isteği iki kez göndermesini engellemenin ilk savunma katmanı budur
// (asıl garanti backend'deki idempotency key/atomik güncellemedir, bu sadece UX'tir).
export default function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  fullWidth = false,
  disabled,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <StyledButton
      type={type}
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? <Spinner size={size === "lg" ? "md" : "sm"} /> : children}
    </StyledButton>
  );
}
