import type { HTMLAttributes } from "react";
import styled, { css } from "styled-components";

export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  hoverEffect?: boolean;
}

const StyledCard = styled.div<{ $padding: CardPadding; $hoverEffect: boolean }>`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  padding: ${({ theme, $padding }) => ($padding === "none" ? 0 : theme.spacing[$padding])};
  transition:
    box-shadow 0.15s ease,
    transform 0.15s ease;

  ${({ theme, $hoverEffect }) =>
    $hoverEffect &&
    css`
      &:hover {
        box-shadow: ${theme.shadows.md};
        transform: translateY(-2px);
      }
    `}
`;

export default function Card({ padding = "md", hoverEffect = false, ...rest }: CardProps) {
  return <StyledCard $padding={padding} $hoverEffect={hoverEffect} {...rest} />;
}
