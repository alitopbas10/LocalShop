import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";

import {
  CANCELLABLE_ORDER_STATUSES,
  OrderStatusBadge,
  PAYABLE_ORDER_STATUSES,
} from "@/components/orders/OrderStatusBadge";
import { Button, Card, EmptyState, ErrorState, LoadingState, Modal } from "@/components/ui";
import PaymentHistory from "@/features/payment/PaymentHistory";
import OrderItemsTable from "@/features/orders/OrderItemsTable";
import OrderTimeline from "@/features/orders/OrderTimeline";
import { useApi } from "@/hooks/useApi";
import { useMutation } from "@/hooks/useMutation";
import { useToast } from "@/hooks/useToast";
import { payment, paths } from "@/routes/paths";
import { ApiError } from "@/services/apiError";
import { getErrorMessage } from "@/services/errorMessages";
import * as orderService from "@/services/orderService";
import { formatDate, formatPrice } from "@/utils/format";

const BackLink = styled(Link)`
  display: inline-block;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const OrdersLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
`;

const OrderDate = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text};
  margin: ${({ theme }) => theme.spacing.xl} 0 ${({ theme }) => theme.spacing.md};
`;

const TotalRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.spacing.md};
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const Total = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.lg};
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.lg};
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

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isCancelModalOpen, setCancelModalOpen] = useState(false);

  const {
    data: order,
    error,
    isLoading,
    refetch,
  } = useApi(() => orderService.getOrder(id ?? ""), [id], { enabled: Boolean(id) });

  const { mutate: cancelOrder, isLoading: isCancelling } = useMutation(orderService.cancelOrder);

  async function handleCancel() {
    if (!order) {
      return;
    }
    try {
      await cancelOrder(order._id);
      setCancelModalOpen(false);
      showToast("Sipariş iptal edildi.", "info");
      // İptal sonrası sayfa tazelenir: durum rozeti, zaman çizelgesi ve aksiyon
      // butonları hep order.status'e göre karar veriyor, elde eski bir kopyayla
      // güncellenmemiş bir ekran göstermemek için sunucudan yeniden çekilir.
      refetch();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  if (isLoading) {
    return <LoadingState message="Sipariş yükleniyor..." />;
  }

  if (error instanceof ApiError && error.code === "NOT_FOUND") {
    return (
      <EmptyState
        title="Sipariş bulunamadı"
        description="Aradığınız sipariş kaldırılmış veya hiç var olmamış olabilir."
        action={<OrdersLink to={paths.ORDERS}>Siparişlerime Dön</OrdersLink>}
      />
    );
  }

  if (error instanceof ApiError && error.code === "FORBIDDEN") {
    return (
      <EmptyState
        title="Bu siparişe erişim yetkiniz yok"
        description="Bu sipariş başka bir hesaba ait."
        action={<OrdersLink to={paths.ORDERS}>Siparişlerime Dön</OrdersLink>}
      />
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (!order) {
    return null;
  }

  const isPayable = PAYABLE_ORDER_STATUSES.includes(order.status);
  const isCancellable = CANCELLABLE_ORDER_STATUSES.includes(order.status);

  return (
    <div>
      <BackLink to={paths.ORDERS}>← Siparişlerim</BackLink>

      <Card padding="lg">
        <HeaderRow>
          <div>
            <Title>{order.orderNumber}</Title>
            <OrderDate>{formatDate(order.createdAt)}</OrderDate>
          </div>
          <OrderStatusBadge status={order.status} />
        </HeaderRow>

        <OrderTimeline status={order.status} cancelledAt={order.cancelledAt} />

        <TotalRow>
          <span>Toplam</span>
          <Total>{formatPrice(order.totalPrice)}</Total>
        </TotalRow>

        <Actions>
          {isPayable && (
            <Button type="button" onClick={() => navigate(payment(order._id))}>
              Ödemeyi Tamamla
            </Button>
          )}
          {isCancellable && (
            <Button type="button" variant="danger" onClick={() => setCancelModalOpen(true)}>
              Siparişi İptal Et
            </Button>
          )}
        </Actions>
      </Card>

      <SectionTitle>Ürünler</SectionTitle>
      <OrderItemsTable items={order.items} sellerIds={order.sellerIds} />

      <PaymentHistory orderId={order._id} />

      <Modal isOpen={isCancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Siparişi iptal et">
        <ModalText>
          Bu siparişi iptal etmek üzeresiniz. Sipariş içindeki ürünlerin stoğu iade edilecek ve bu işlem geri
          alınamaz. Emin misiniz?
        </ModalText>
        <ModalActions>
          <Button type="button" variant="secondary" onClick={() => setCancelModalOpen(false)}>
            Vazgeç
          </Button>
          <Button type="button" variant="danger" onClick={handleCancel} isLoading={isCancelling}>
            Siparişi İptal Et
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}
