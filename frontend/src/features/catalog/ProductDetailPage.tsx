import { useEffect, useState, type MouseEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";

import { Badge, Button, EmptyState, ErrorState, LoadingState, Select } from "@/components/ui";
import { CATEGORY_LABELS } from "@/features/catalog/categoryPresentation";
import ProductImage from "@/features/catalog/ProductImage";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useMutation } from "@/hooks/useMutation";
import { useToast } from "@/hooks/useToast";
import { paths } from "@/routes/paths";
import { ApiError } from "@/services/apiError";
import * as catalogService from "@/services/catalogService";
import { getErrorMessage } from "@/services/errorMessages";
import { formatPrice } from "@/utils/format";

const MAX_QUANTITY = 99;

const BackLink = styled(Link)`
  display: inline-block;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  font-size: ${({ theme }) => theme.fontSizes.sm};
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

const ImageColumn = styled.div`
  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 420px;
    flex-shrink: 0;
  }
`;

const InfoColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const BadgeRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Name = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xxl};
  color: ${({ theme }) => theme.colors.text};
`;

const SellerName = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Price = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.xxl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text};
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.text};
  white-space: pre-line;
`;

const PurchaseRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const QuantityField = styled.div`
  width: 6rem;
`;

const HelperText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, status: authStatus } = useAuth();
  const { addItem } = useCart();
  const { showToast } = useToast();

  const {
    data: product,
    error,
    isLoading,
    refetch,
  } = useApi(() => catalogService.getProduct(id ?? ""), [id], { enabled: Boolean(id) });

  const [quantity, setQuantity] = useState(1);

  // Farklı bir ürüne geçildiğinde (ör. "benzer ürünler" gibi bir bağlantıyla) önceki
  // ürünün adet seçimi yeni ürüne taşınmamalı, her zaman 1'den başlanmalı.
  useEffect(() => {
    setQuantity(1);
  }, [product?._id]);

  const { mutate: addToCart, isLoading: isAdding } = useMutation(addItem);

  function handleBackClick(event: MouseEvent<HTMLAnchorElement>) {
    // location.key "default" ise bu sekmede geçmiş yoktur (doğrudan link ile açılmış
    // olabilir); bu durumda düz /products'a giden Link'in varsayılan davranışına
    // bırakılır. Aksi halde navigate(-1) ile tam olarak geldiğimiz filtreli/sayfalı
    // katalog URL'ine geri dönülür.
    if (location.key !== "default") {
      event.preventDefault();
      navigate(-1);
    }
  }

  async function handleAddToCart() {
    if (authStatus === "unauthenticated") {
      navigate(paths.LOGIN, { state: { from: location } });
      return;
    }
    if (!product) {
      return;
    }
    try {
      await addToCart(product._id, quantity);
      showToast("Ürün sepete eklendi.", "success");
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  if (isLoading) {
    return <LoadingState message="Ürün yükleniyor..." />;
  }

  if (error instanceof ApiError && error.code === "NOT_FOUND") {
    return (
      <EmptyState
        title="Ürün bulunamadı"
        description="Aradığınız ürün kaldırılmış veya hiç var olmamış olabilir."
        action={<BackLink to={paths.PRODUCTS}>Kataloğa dön</BackLink>}
      />
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (!product) {
    return null;
  }

  const isSeller = user?.role === "seller";
  const outOfStock = product.stock <= 0;
  const addToCartDisabled = isSeller || outOfStock || authStatus === "loading" || isAdding;
  const maxQuantity = Math.max(1, Math.min(product.stock, MAX_QUANTITY));
  const quantityOptions = Array.from({ length: maxQuantity }, (_, index) => ({
    value: String(index + 1),
    label: String(index + 1),
  }));

  return (
    <div>
      <BackLink to={paths.PRODUCTS} onClick={handleBackClick}>
        ← Kataloğa dön
      </BackLink>

      <Layout>
        <ImageColumn>
          <ProductImage
            imageUrl={product.imageUrl}
            category={product.category}
            alt={product.name}
            aspectRatio="1 / 1"
          />
        </ImageColumn>

        <InfoColumn>
          <BadgeRow>
            <Badge variant="neutral">{CATEGORY_LABELS[product.category]}</Badge>
            <Badge variant={outOfStock ? "danger" : "success"}>
              {outOfStock ? "Tükendi" : `Stokta ${product.stock} adet`}
            </Badge>
          </BadgeRow>

          <Name>{product.name}</Name>
          <SellerName>{product.seller.name ?? "Bilinmeyen satıcı"}</SellerName>
          <Price>{formatPrice(product.price)}</Price>
          <Description>{product.description}</Description>

          <PurchaseRow>
            <QuantityField>
              <Select
                label="Adet"
                options={quantityOptions}
                value={String(Math.min(quantity, maxQuantity))}
                onChange={(event) => setQuantity(Number(event.target.value))}
                disabled={isSeller || outOfStock}
              />
            </QuantityField>
            <Button
              type="button"
              onClick={handleAddToCart}
              disabled={addToCartDisabled}
              isLoading={isAdding}
            >
              Sepete Ekle
            </Button>
          </PurchaseRow>

          {isSeller && <HelperText>Satıcı hesabıyla alışveriş yapılamaz.</HelperText>}
        </InfoColumn>
      </Layout>
    </div>
  );
}
