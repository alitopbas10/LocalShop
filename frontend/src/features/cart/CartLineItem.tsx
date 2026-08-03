import { Link } from "react-router-dom";
import styled from "styled-components";

import { Badge, Button } from "@/components/ui";
import ProductImage from "@/features/catalog/ProductImage";
import { useCart } from "@/hooks/useCart";
import { useMutation } from "@/hooks/useMutation";
import { useToast } from "@/hooks/useToast";
import { productDetail } from "@/routes/paths";
import { getErrorMessage } from "@/services/errorMessages";
import type { CartIssue, CartItemView } from "@/types/models";
import { formatPrice } from "@/utils/format";

export interface CartLineItemProps {
  item: CartItemView;
  issue?: CartIssue;
}

const MAX_QUANTITY = 99;

const Row = styled.div<{ $faded: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  opacity: ${({ $faded }) => ($faded ? 0.6 : 1)};

  &:last-child {
    border-bottom: none;
  }
`;

const Thumb = styled.div`
  width: 4.5rem;
  flex-shrink: 0;
`;

// Ürün tamamen kaldırılmışsa (product: null) kategorisi de bilinmez, bu yüzden
// ProductImage'ın kategori bazlı yer tutucusu kullanılamaz — sade, nötr bir kutu yeterli.
const RemovedThumb = styled.div`
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  text-align: center;
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  align-items: flex-start;
`;

const NameLink = styled(Link)`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const Name = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const UnitPrice = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const QuantityControl = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const StepButton = styled.button`
  /* Dokunma hedefi en az 44x44px olsun diye. */
  width: 2.75rem;
  height: 2.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const QuantityValue = styled.span`
  min-width: 1.5rem;
  text-align: center;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const LineTotal = styled.span`
  min-width: 5.5rem;
  text-align: right;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

export default function CartLineItem({ item, issue }: CartLineItemProps) {
  const { updateItem, removeItem } = useCart();
  const { showToast } = useToast();

  const { mutate: changeQuantity, isLoading: isChangingQuantity } = useMutation((quantity: number) =>
    updateItem(item.productId, quantity),
  );
  const { mutate: remove, isLoading: isRemoving } = useMutation(() => removeItem(item.productId));

  // Satır her iki mutasyondan biri sürerken kilitlenir: hem tekrar tıklamayı hem de
  // aynı anda hem adet değiştirip hem kaldırmaya çalışmayı engeller.
  const isLocked = isChangingQuantity || isRemoving;

  // availableStock her zaman ürünün güncel (son çekilen) stoğudur — sorunsuz satırlarda
  // da, INSUFFICIENT_STOCK'ta da, PRODUCT_UNAVAILABLE'da (0) da doğru üst sınırı verir.
  const maxQuantity = Math.min(item.availableStock, MAX_QUANTITY);

  async function handleQuantityChange(nextQuantity: number) {
    try {
      // 0'a inen adet backend'de "sepetten çıkar" olarak yorumlanır (updateItemSchema
      // min:0, cart.service.updateItemQuantity), ayrı bir DELETE isteği gerekmez.
      await changeQuantity(nextQuantity);
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  async function handleRemove() {
    try {
      await remove();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  const displayName = item.product?.name ?? issue?.productName ?? "Bilinmeyen ürün";

  return (
    <Row $faded={!item.available}>
      <Thumb>
        {item.product ? (
          <ProductImage
            imageUrl={item.product.imageUrl}
            category={item.product.category}
            alt={item.product.name}
            aspectRatio="1 / 1"
          />
        ) : (
          <RemovedThumb>Kaldırıldı</RemovedThumb>
        )}
      </Thumb>

      <Info>
        {item.product ? (
          <NameLink to={productDetail(item.productId)}>{displayName}</NameLink>
        ) : (
          <Name>{displayName}</Name>
        )}
        {item.product && <UnitPrice>{formatPrice(item.unitPrice)}</UnitPrice>}
        {issue && (
          <Badge variant="danger">
            {issue.issue === "PRODUCT_UNAVAILABLE" ? "Satışta değil" : "Stok yetersiz"}
          </Badge>
        )}
      </Info>

      <QuantityControl>
        <StepButton
          type="button"
          onClick={() => handleQuantityChange(item.quantity - 1)}
          disabled={isLocked}
          aria-label="Adedi azalt"
        >
          −
        </StepButton>
        <QuantityValue aria-live="polite">{isLocked ? "…" : item.quantity}</QuantityValue>
        <StepButton
          type="button"
          onClick={() => handleQuantityChange(item.quantity + 1)}
          disabled={isLocked || !item.product || item.quantity >= maxQuantity}
          aria-label="Adedi artır"
        >
          +
        </StepButton>
      </QuantityControl>

      <LineTotal>{formatPrice(item.lineTotal)}</LineTotal>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleRemove}
        isLoading={isRemoving}
        disabled={isLocked}
      >
        Kaldır
      </Button>
    </Row>
  );
}
