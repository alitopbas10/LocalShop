import type { HTMLAttributes } from "react";
import styled from "styled-components";

import type { Theme } from "@/styles/theme";

export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const VARIANT_COLOR: Record<BadgeVariant, (theme: Theme) => string> = {
  neutral: (theme) => theme.colors.textMuted,
  success: (theme) => theme.colors.success,
  warning: (theme) => theme.colors.warning,
  danger: (theme) => theme.colors.danger,
  info: (theme) => theme.colors.info,
};

const StyledBadge = styled.span<{ $variant: BadgeVariant }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme, $variant }) => VARIANT_COLOR[$variant](theme)};
  /* Rengin kendisi hep temadan gelir; sadece açık zemin tonu bu renkle yüzey rengi
     karıştırılarak (color-mix) türetilir, ayrı bir "light" renk seti icat edilmez. */
  background: ${({ theme, $variant }) =>
    `color-mix(in srgb, ${VARIANT_COLOR[$variant](theme)} 18%, ${theme.colors.surface})`};
`;

export default function Badge({ variant = "neutral", ...rest }: BadgeProps) {
  return <StyledBadge $variant={variant} {...rest} />;
}
