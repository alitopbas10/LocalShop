import { Component, type ErrorInfo, type ReactNode } from "react";
import styled from "styled-components";

import Button from "@/components/ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.md};
  min-height: 60vh;
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
`;

const Message = styled.p`
  max-width: 32rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

// Sınıf bileşeni olmak ZORUNDA: React'in hata sınırı API'si (getDerivedStateFromError /
// componentDidCatch) yalnızca sınıf bileşenlerinde vardır, bir hook karşılığı yoktur —
// render sırasında fırlatılan bir hatayı yakalayıp beyaz ekran yerine bu dosyadaki
// fallback'i göstermenin başka bir yolu yok.
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    // Hassas hiçbir veri (kart bilgisi zaten hiç state'e girmiyor) burada loglanmaz;
    // yalnızca render hatasının kendisi, hata ayıklama için konsola yazılır.
    console.error("Beklenmeyen bir render hatası oluştu:", error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Wrapper role="alert">
          <Title>Bir şeyler ters gitti</Title>
          <Message>
            Sayfa beklenmeyen bir hatayla karşılaştı. Sorun devam ederse sayfayı yenilemeyi deneyin.
          </Message>
          <Button type="button" onClick={this.handleReload}>
            Sayfayı Yenile
          </Button>
        </Wrapper>
      );
    }

    return this.props.children;
  }
}
