import { Link } from "react-router-dom";
import styled from "styled-components";

import { EmptyState, ErrorState, LoadingState } from "@/components/ui";
import CartIssuesBanner from "@/features/cart/CartIssuesBanner";
import CartLineItem from "@/features/cart/CartLineItem";
import CartSummary from "@/features/cart/CartSummary";
import { useCart } from "@/hooks/useCart";
import { usePageTitle } from "@/hooks/usePageTitle";
import { paths } from "@/routes/paths";
import type { CartIssue } from "@/types/models";

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: row;
    align-items: flex-start;
  }
`;

const LinesColumn = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const LineList = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 0 ${({ theme }) => theme.spacing.md};
`;

// Sağdaki özet paneli masaüstünde sabit genişlikte bir kenar çubuğu, mobilde satır
// listesinin altında tam genişlikte durur (bkz. Layout'un flex-direction değişimi).
const SummaryColumn = styled.div`
  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 320px;
    flex-shrink: 0;
  }
`;

const CatalogLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

export default function CartPage() {
  usePageTitle("Sepetim");

  // Sepet verisi tamamen CartContext'ten okunur; bu sayfa kendi başına bir istek atmaz
  // (CartProvider zaten authenticate + customer durumunda sepeti otomatik yüklüyor,
  // bkz. CartContext.tsx).
  const { cart, isLoading, error, refreshCart } = useCart();

  if (isLoading) {
    return <LoadingState message="Sepet yükleniyor..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refreshCart} titleAs="h1" />;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        titleAs="h1"
        title="Sepetiniz boş"
        description="Katalogdan beğendiğiniz ürünleri sepetinize ekleyin."
        action={<CatalogLink to={paths.PRODUCTS}>Kataloğa git</CatalogLink>}
      />
    );
  }

  const issuesByProductId = new Map<string, CartIssue>(cart.issues.map((issue) => [issue.productId, issue]));

  return (
    <div>
      <Title>Sepetim</Title>
      <Layout>
        <LinesColumn>
          {cart.hasIssues && <CartIssuesBanner issues={cart.issues} />}

          <LineList>
            {cart.items.map((item) => (
              <CartLineItem key={item.productId} item={item} issue={issuesByProductId.get(item.productId)} />
            ))}
          </LineList>
        </LinesColumn>

        <SummaryColumn>
          <CartSummary cart={cart} />
        </SummaryColumn>
      </Layout>
    </div>
  );
}
