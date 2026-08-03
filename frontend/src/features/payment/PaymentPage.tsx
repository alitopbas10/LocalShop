import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styled from "styled-components";

import { Badge, Card, EmptyState, ErrorState, LoadingState, type BadgeVariant } from "@/components/ui";
import CardForm from "@/features/payment/CardForm";
import PaymentHistory from "@/features/payment/PaymentHistory";
import { useApi } from "@/hooks/useApi";
import { useCart } from "@/hooks/useCart";
import { orderDetail } from "@/routes/paths";
import * as orderService from "@/services/orderService";
import type { OrderStatus, PayOrderResult } from "@/types/models";
import { formatPrice } from "@/utils/format";

// Yalnızca bu iki durumdaki bir sipariş ödemeye açıktır (backend'deki
// PAYABLE_ORDER_STATUSES ile birebir aynı liste, bkz. payment.service.ts): diğer tüm
// durumlarda (PAID, CANCELLED, SHIPPED, DELIVERED) form hiç gösterilmez.
const PAYABLE_ORDER_STATUSES: readonly OrderStatus[] = ["PENDING_PAYMENT", "PAYMENT_FAILED"];

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Ödeme bekleniyor",
  PAID: "Ödendi",
  PAYMENT_FAILED: "Ödeme başarısız",
  SHIPPED: "Kargoya verildi",
  DELIVERED: "Teslim edildi",
  CANCELLED: "İptal edildi",
};

const ORDER_STATUS_BADGE_VARIANT: Record<OrderStatus, BadgeVariant> = {
  PENDING_PAYMENT: "warning",
  PAID: "success",
  PAYMENT_FAILED: "danger",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "neutral",
};

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SummaryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const OrderNumber = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const ItemList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  padding-bottom: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text};
`;

const TotalRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const DetailLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

export default function PaymentPage() {
  const { orderId } = useParams();
  const { refreshCart } = useCart();
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Kullanıcı bu sayfaya doğrudan bir URL ile gelebilir (yer imi, sayfa yenileme);
  // sipariş oluşturma sepeti sunucuda zaten boşaltmıştır (bkz. CartContext.
  // createOrderFromCart), CartContext'in bunu bu senaryoda da görmesi için burada
  // ayrıca bir tazeleme tetiklenir.
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const {
    data: order,
    error,
    isLoading,
    refetch,
  } = useApi(() => orderService.getOrder(orderId ?? ""), [orderId], { enabled: Boolean(orderId) });

  function handleAttemptRecorded(result: PayOrderResult) {
    // Ödeme geçmişi tablosu kendi verisini bir kez çeker (bkz. PaymentHistory); yeni bir
    // deneme (başarılı ya da başarısız) kaydedildiğinde o listeyi zorla yeniden monte
    // edip tazelenmesini sağlamanın en basit yolu key'i değiştirmektir.
    setHistoryRefreshKey((key) => key + 1);

    // Ödeme başarılıysa sipariş durumu sunucuda PAID'e döner; üstteki özet kartının da
    // (hâlâ eski durumu gösteren) güncellenmesi için sipariş yeniden çekilir.
    if (result.payment.status === "SUCCEEDED") {
      refetch();
    }
  }

  if (isLoading) {
    return <LoadingState message="Sipariş yükleniyor..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (!order) {
    return null;
  }

  const isPayable = PAYABLE_ORDER_STATUSES.includes(order.status);

  return (
    <div>
      <Title>Ödeme</Title>

      <Card padding="lg">
        <SummaryHeader>
          <OrderNumber>Sipariş No: {order.orderNumber}</OrderNumber>
          <Badge variant={ORDER_STATUS_BADGE_VARIANT[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
        </SummaryHeader>

        <ItemList>
          {order.items.map((item) => (
            <ItemRow key={item.productId}>
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{formatPrice(item.lineTotal)}</span>
            </ItemRow>
          ))}
        </ItemList>

        <TotalRow>
          <span>Toplam</span>
          <span>{formatPrice(order.totalPrice)}</span>
        </TotalRow>
      </Card>

      {isPayable ? (
        <CardForm order={order} onAttemptRecorded={handleAttemptRecorded} />
      ) : (
        <EmptyState
          title="Bu sipariş şu anda ödemeye açık değil"
          description={`Sipariş durumu: ${ORDER_STATUS_LABELS[order.status]}`}
          action={<DetailLink to={orderDetail(order._id)}>Sipariş Detayına Git</DetailLink>}
        />
      )}

      <PaymentHistory key={historyRefreshKey} orderId={order._id} />
    </div>
  );
}
