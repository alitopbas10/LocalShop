import styled, { keyframes } from "styled-components";

import VisuallyHidden from "@/components/ui/VisuallyHidden";
import type { Theme } from "@/styles/theme";

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
}

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

// Spinner çapı için theme'de ayrı bir "boyut" ölçeği yok; mevcut fontSizes ölçeğinden
// ödünç alınır ki yeni bir sabit icat etmek yerine var olan ölçeğe sadık kalınsın.
const DIAMETER: Record<SpinnerSize, keyof Theme["fontSizes"]> = {
  sm: "md",
  md: "xl",
  lg: "xxl",
};

const Ring = styled.span<{ $size: SpinnerSize }>`
  display: inline-block;
  width: ${({ theme, $size }) => theme.fontSizes[DIAMETER[$size]]};
  height: ${({ theme, $size }) => theme.fontSizes[DIAMETER[$size]]};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.radii.full};
  animation: ${spin} 0.6s linear infinite;
`;

export default function Spinner({ size = "md", label = "Yükleniyor" }: SpinnerProps) {
  return (
    <span role="status">
      <Ring $size={size} />
      <VisuallyHidden>{label}</VisuallyHidden>
    </span>
  );
}
