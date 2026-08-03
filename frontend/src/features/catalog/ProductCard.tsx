import { Link } from "react-router-dom";
import styled from "styled-components";

import { Badge } from "@/components/ui";
import { CATEGORY_LABELS } from "@/features/catalog/categoryPresentation";
import ProductImage from "@/features/catalog/ProductImage";
import { productDetail } from "@/routes/paths";
import type { CatalogListItem } from "@/types/models";
import { formatPrice } from "@/utils/format";

export interface ProductCardProps {
  product: CatalogListItem;
}

// Kartın tamamı tek bir <a> (Link) elemanıdır; içine ikinci bir interaktif eleman
// (buton, iç içe link) KONMAZ — bu hem geçersiz HTML (iç içe interaktif elemanlar)
// hem de ekran okuyucu/klavye kullanıcıları için belirsiz bir odak sırası üretir.
const CardLink = styled(Link)<{ $faded: boolean }>`
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  overflow: hidden;
  opacity: ${({ $faded }) => ($faded ? 0.6 : 1)};
  transition:
    box-shadow 0.15s ease,
    transform 0.15s ease;

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.md};
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const ImageWrapper = styled.div`
  position: relative;
`;

const StockBadgeWrapper = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.spacing.sm};
  right: ${({ theme }) => theme.spacing.sm};
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.md};
  flex: 1;
`;

const Name = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const SellerName = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Price = styled.span`
  margin-top: auto;
  padding-top: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text};
`;

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <CardLink to={productDetail(product._id)} $faded={!product.inStock}>
      <ImageWrapper>
        <ProductImage imageUrl={product.imageUrl} category={product.category} alt={product.name} />
        {!product.inStock && (
          <StockBadgeWrapper>
            <Badge variant="danger">Tükendi</Badge>
          </StockBadgeWrapper>
        )}
      </ImageWrapper>
      <Body>
        <Badge variant="neutral">{CATEGORY_LABELS[product.category]}</Badge>
        <Name>{product.name}</Name>
        <SellerName>{product.seller.name ?? "Bilinmeyen satıcı"}</SellerName>
        <Price>{formatPrice(product.price)}</Price>
      </Body>
    </CardLink>
  );
}
