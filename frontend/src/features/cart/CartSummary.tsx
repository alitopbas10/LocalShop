import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import { Button, Modal } from "@/components/ui";
import { useCart } from "@/hooks/useCart";
import { useMutation } from "@/hooks/useMutation";
import { useToast } from "@/hooks/useToast";
import { payment } from "@/routes/paths";
import { getErrorMessage } from "@/services/errorMessages";
import type { CartView } from "@/types/models";
import { formatPrice } from "@/utils/format";

export interface CartSummaryProps {
  cart: CartView;
}

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const TotalRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const TotalLabel = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const TotalValue = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text};
`;

const Note = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.danger};
`;

const HelperText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
`;

const ModalText = styled.p`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.sm};
`;

export default function CartSummary({ cart }: CartSummaryProps) {
  const navigate = useNavigate();
  const { clearCart, createOrderFromCart } = useCart();
  const { showToast } = useToast();
  const [isClearModalOpen, setClearModalOpen] = useState(false);

  const { mutate: submitOrder, isLoading: isSubmitting } = useMutation(createOrderFromCart);
  const { mutate: performClearCart, isLoading: isClearing } = useMutation(clearCart);

  const isEmpty = cart.items.length === 0;
  const checkoutDisabled = cart.hasIssues || isEmpty;

  async function handleCheckout() {
    try {
      // Sepeti başarı ya da hata her iki durumda da tazelemek CartContext.
      // createOrderFromCart'ın sorumluluğunda (bkz. CartContext.tsx) — burada sayfa
      // sadece yönlendirme ve hata mesajıyla ilgilenir.
      const order = await submitOrder();
      navigate(payment(order._id), { replace: true });
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  async function handleClearCart() {
    try {
      await performClearCart();
      setClearModalOpen(false);
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  return (
    <Panel>
      <Row>
        <span>Ürün adedi</span>
        <span>{cart.itemCount}</span>
      </Row>
      <Row>
        <span>Farklı ürün</span>
        <span>{cart.distinctItemCount}</span>
      </Row>

      <Divider />

      <TotalRow>
        <TotalLabel>Ara Toplam</TotalLabel>
        <TotalValue>{formatPrice(cart.subtotal)}</TotalValue>
      </TotalRow>

      {cart.hasIssues && <Note>Sorunlu ürünler toplama dahil edilmedi.</Note>}

      <Button type="button" fullWidth onClick={handleCheckout} disabled={checkoutDisabled} isLoading={isSubmitting}>
        Siparişi Tamamla
      </Button>

      {cart.hasIssues && (
        <HelperText>Sipariş oluşturmadan önce sepetteki sorunlu ürünleri çözmelisiniz.</HelperText>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        fullWidth
        onClick={() => setClearModalOpen(true)}
        disabled={isEmpty}
      >
        Sepeti Temizle
      </Button>

      <Modal isOpen={isClearModalOpen} onClose={() => setClearModalOpen(false)} title="Sepeti temizle">
        <ModalText>Sepetinizdeki tüm ürünler kaldırılacak. Emin misiniz?</ModalText>
        <ModalActions>
          <Button type="button" variant="secondary" onClick={() => setClearModalOpen(false)}>
            Vazgeç
          </Button>
          <Button type="button" variant="danger" onClick={handleClearCart} isLoading={isClearing}>
            Sepeti Temizle
          </Button>
        </ModalActions>
      </Modal>
    </Panel>
  );
}
