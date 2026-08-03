import styled from "styled-components";

import Button from "@/components/ui/Button";
import { getErrorMessage } from "@/services/errorMessages";

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  // Bazı sayfalarda (ör. detay sayfaları) hata erken return ile tüm sayfanın yerine
  // geçer ve sayfanın kendi <h1>'i hiç render edilmez; bu durumda burada "h1" verilmezse
  // sayfada atlanmış bir başlık seviyesi (h1 yokken h2) oluşur. Varsayılan "h2": normal
  // kullanım zaten bir sayfa başlığının ALTINDA (bir bölüm hatası olarak) gösterilir.
  titleAs?: "h1" | "h2";
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.xxl} ${({ theme }) => theme.spacing.lg};
  text-align: center;
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const Message = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
`;

export default function ErrorState({ error, onRetry, titleAs = "h2" }: ErrorStateProps) {
  return (
    <Wrapper role="alert">
      <Title as={titleAs}>Bir şeyler ters gitti</Title>
      <Message>{getErrorMessage(error)}</Message>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Tekrar dene
        </Button>
      )}
    </Wrapper>
  );
}
