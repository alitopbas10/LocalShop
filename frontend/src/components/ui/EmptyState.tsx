import type { ReactNode } from "react";
import styled from "styled-components";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  // Bazı sayfalarda boş durum erken return ile tüm sayfanın yerine geçer ve sayfanın
  // kendi <h1>'i hiç render edilmez; bu durumda "h1" verilmezse sayfada atlanmış bir
  // başlık seviyesi (h1 yokken h2) oluşur. Varsayılan "h2": normal kullanımda zaten bir
  // sayfa başlığının ALTINDA (bir bölüm sonucu olarak) gösterilir.
  titleAs?: "h1" | "h2";
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.xxl} ${({ theme }) => theme.spacing.lg};
  text-align: center;
`;

const IconWrapper = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xxl};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ActionWrapper = styled.div`
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

export default function EmptyState({ icon, title, description, action, titleAs = "h2" }: EmptyStateProps) {
  return (
    <Wrapper>
      {icon && <IconWrapper aria-hidden="true">{icon}</IconWrapper>}
      <Title as={titleAs}>{title}</Title>
      {description && <Description>{description}</Description>}
      {action && <ActionWrapper>{action}</ActionWrapper>}
    </Wrapper>
  );
}
