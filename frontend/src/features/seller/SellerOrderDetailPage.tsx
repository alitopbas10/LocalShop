import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import styled from "styled-components";

import { FulfillmentStatusBadge, OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Button, Card, EmptyState, ErrorState, LoadingState, Modal } from "@/components/ui";
import { getFulfillmentAction } from "@/features/seller/fulfillmentAction";
import { useApi } from "@/hooks/useApi";
import { useMutation } from "@/hooks/useMutation";
import { useToast } from "@/hooks/useToast";
import { paths } from "@/routes/paths";
import { ApiError } from "@/services/apiError";
import { getErrorMessage } from "@/services/errorMessages";
import * as sellerOrderService from "@/services/sellerOrderService";
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

const OrderMeta = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const OtherSellersNote = styled.p`
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => `color-mix(in srgb, ${theme.colors.info} 10%, ${theme.colors.surface})`};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Th = styled.th`
  text-align: left;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
`;

const Td = styled.td`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
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

export default function SellerOrderDetailPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [isConfirmOpen, setConfirmOpen] = useState(false);

  const {
    data: order,
    error,
    isLoading,
    refetch,
  } = useApi(() => sellerOrderService.getById(id ?? ""), [id], { enabled: Boolean(id) });

  const { mutate: updateFulfillment, isLoading: isUpdating } = useMutation(sellerOrderService.updateFulfillment);

  const action = order ? getFulfillmentAction(order) : null;

  async function handleConfirm() {
    if (!order || !action) {
      return;
    }
    try {
      await updateFulfillment(order._id, action.nextStatus);
      showToast("Sipariş güncellendi.", "success");
      setConfirmOpen(false);
      refetch();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  if (isLoading) {
    return <LoadingState message="Sipariş yükleniyor..." />;
  }

  // getSellerOrderById sahiplik kontrolünü sorgunun içine gömer (Order.findOne({ _id,
  // sellerIds: sellerId })): bu satıcının hiç satırı olmadığı bir siparişte 403 değil
  // 404 döner — o siparişin varlığını bu satıcıya sızdırmanın bir anlamı yok. Bu yüzden
  // burada ayrı bir FORBIDDEN dalına gerek yok, yalnızca NOT_FOUND ele alınır.
  if (error instanceof ApiError && error.code === "NOT_FOUND") {
    return (
      <EmptyState
        title="Sipariş bulunamadı"
        description="Bu sipariş size ait değil ya da hiç var olmamış olabilir."
        action={<OrdersLink to={paths.SELLER_ORDERS}>Siparişlere Dön</OrdersLink>}
      />
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (!order) {
    return null;
  }

  return (
    <div>
      <BackLink to={paths.SELLER_ORDERS}>← Siparişler</BackLink>

      <Card padding="lg">
        <HeaderRow>
          <div>
            <Title>{order.orderNumber}</Title>
            <OrderMeta>
              {formatDate(order.createdAt)} · {order.buyer.name ?? "Bilinmeyen alıcı"}
            </OrderMeta>
          </div>
          <OrderStatusBadge status={order.status} />
        </HeaderRow>

        {order.hasOtherSellers && (
          <OtherSellersNote>
            Bu siparişte başka satıcıların ürünleri de bulunuyor. Yalnızca size ait ürünler gösteriliyor.
          </OtherSellersNote>
        )}

        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>Ürün</Th>
                <Th>Birim Fiyat</Th>
                <Th>Adet</Th>
                <Th>Satır Toplamı</Th>
                <Th>Kargo Durumu</Th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.productId}>
                  <Td>{item.name}</Td>
                  <Td>{formatPrice(item.price)}</Td>
                  <Td>{item.quantity}</Td>
                  <Td>{formatPrice(item.lineTotal)}</Td>
                  <Td>
                    <FulfillmentStatusBadge status={item.fulfillmentStatus} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>

        {/* order.totalPrice bu görünümde hiç yok (backend zaten dönmüyor): diğer
            satıcıların tutarını da içerir. Gösterilecek tek doğru rakam sellerSubtotal. */}
        <TotalRow>
          <span>Sizin Payınız</span>
          <Total>{formatPrice(order.sellerSubtotal)}</Total>
        </TotalRow>

        {action && (
          <Actions>
            <Button type="button" onClick={() => setConfirmOpen(true)}>
              {action.label}
            </Button>
          </Actions>
        )}
      </Card>

      <Modal isOpen={isConfirmOpen} onClose={() => setConfirmOpen(false)} title={action?.label}>
        <ModalText>{action?.confirmText}</ModalText>
        <ModalActions>
          <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>
            Vazgeç
          </Button>
          <Button type="button" onClick={handleConfirm} isLoading={isUpdating}>
            Onayla
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}
