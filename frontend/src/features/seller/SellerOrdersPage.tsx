import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import styled from "styled-components";

import {
  FULFILLMENT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  OrderStatusBadge,
} from "@/components/orders/OrderStatusBadge";
import { Button, Card, EmptyState, ErrorState, LoadingState, Modal, Pagination, Select } from "@/components/ui";
import { getFulfillmentAction } from "@/features/seller/fulfillmentAction";
import { useApi } from "@/hooks/useApi";
import { useMutation } from "@/hooks/useMutation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/hooks/useToast";
import { sellerOrderDetail } from "@/routes/paths";
import { getErrorMessage } from "@/services/errorMessages";
import * as sellerOrderService from "@/services/sellerOrderService";
import type { UpdatableFulfillmentStatus } from "@/services/sellerOrderService";
import type { FulfillmentStatus, OrderStatus, SellerOrder } from "@/types/models";
import { formatDate, formatPrice } from "@/utils/format";

const PAGE_LIMIT = 10;

const ORDER_STATUS_VALUES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];
const FULFILLMENT_STATUS_VALUES = Object.keys(FULFILLMENT_STATUS_LABELS) as FulfillmentStatus[];

function isOrderStatus(value: string | null): value is OrderStatus {
  return value !== null && (ORDER_STATUS_VALUES as string[]).includes(value);
}

function isFulfillmentStatus(value: string | null): value is FulfillmentStatus {
  return value !== null && (FULFILLMENT_STATUS_VALUES as string[]).includes(value);
}

const ORDER_STATUS_OPTIONS = [
  { value: "", label: "Tüm Durumlar" },
  ...ORDER_STATUS_VALUES.map((value) => ({ value, label: ORDER_STATUS_LABELS[value] })),
];

const FULFILLMENT_STATUS_OPTIONS = [
  { value: "", label: "Tüm Kargo Durumları" },
  ...FULFILLMENT_STATUS_VALUES.map((value) => ({ value, label: FULFILLMENT_STATUS_LABELS[value] })),
];

interface PendingAction {
  order: SellerOrder;
  label: string;
  nextStatus: UpdatableFulfillmentStatus;
  confirmText: string;
}

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const FiltersRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: repeat(2, 1fr);
    max-width: 480px;
  }
`;

const OrderList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

const OrderHeading = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const OrderNumberLink = styled(Link)`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.md};
`;

const OrderMeta = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ItemsList = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  margin: ${({ theme }) => theme.spacing.sm} 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text};
`;

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
  padding-top: ${({ theme }) => theme.spacing.sm};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const SubtotalBlock = styled.div`
  display: flex;
  flex-direction: column;
`;

const SubtotalValue = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.md};
  color: ${({ theme }) => theme.colors.text};
`;

const SubtotalLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
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

export default function SellerOrdersPage() {
  usePageTitle("Gelen Siparişler");

  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const statusParam = searchParams.get("status");
  const status = isOrderStatus(statusParam) ? statusParam : undefined;
  const fulfillmentParam = searchParams.get("fulfillmentStatus");
  const fulfillmentStatus = isFulfillmentStatus(fulfillmentParam) ? fulfillmentParam : undefined;

  const pageParam = Number(searchParams.get("page"));
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1;

  function updateParams(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    next.set("page", "1");
    setSearchParams(next);
  }

  function goToPage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    setSearchParams(next);
  }

  const {
    data: result,
    error,
    isLoading,
    refetch,
  } = useApi(
    () => sellerOrderService.listIncoming({ page, limit: PAGE_LIMIT, status, fulfillmentStatus, sort: "newest" }),
    [page, status, fulfillmentStatus],
  );

  const { mutate: updateFulfillment, isLoading: isUpdating } = useMutation(
    (orderId: string, nextStatus: UpdatableFulfillmentStatus) =>
      sellerOrderService.updateFulfillment(orderId, nextStatus),
  );

  async function handleConfirmAction() {
    if (!pendingAction) {
      return;
    }
    try {
      await updateFulfillment(pendingAction.order._id, pendingAction.nextStatus);
      showToast("Sipariş güncellendi.", "success");
      setPendingAction(null);
      refetch();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  return (
    <div>
      <Title>Gelen Siparişler</Title>

      <FiltersRow>
        <Select
          label="Sipariş Durumu"
          options={ORDER_STATUS_OPTIONS}
          value={status ?? ""}
          onChange={(event) => updateParams({ status: event.target.value || undefined })}
        />
        <Select
          label="Kargo Durumu"
          options={FULFILLMENT_STATUS_OPTIONS}
          value={fulfillmentStatus ?? ""}
          onChange={(event) => updateParams({ fulfillmentStatus: event.target.value || undefined })}
        />
      </FiltersRow>

      {isLoading && <LoadingState message="Siparişler yükleniyor..." />}

      {!isLoading && error !== null && <ErrorState error={error} onRetry={refetch} />}

      {!isLoading && error === null && result && result.data.length === 0 && (
        <EmptyState title="Bu filtrelerle eşleşen sipariş yok" description="Farklı bir durum filtresi deneyin." />
      )}

      {!isLoading && error === null && result && result.data.length > 0 && (
        <>
          <OrderList>
            {result.data.map((order) => {
              const action = getFulfillmentAction(order);

              return (
                <Card key={order._id} padding="lg">
                  <CardHeader>
                    <OrderHeading>
                      <OrderNumberLink to={sellerOrderDetail(order._id)}>{order.orderNumber}</OrderNumberLink>
                      <OrderMeta>
                        {formatDate(order.createdAt)} · {order.buyer.name ?? "Bilinmeyen alıcı"}
                      </OrderMeta>
                    </OrderHeading>
                    <OrderStatusBadge status={order.status} />
                  </CardHeader>

                  <ItemsList>
                    {order.items.map((item) => (
                      <li key={item.productId}>
                        {item.name} × {item.quantity}
                      </li>
                    ))}
                  </ItemsList>

                  <CardFooter>
                    {/* order.totalPrice BURADA GÖSTERİLMEZ: o tutar siparişteki diğer
                        satıcıların satırlarını da içerir. Satıcının görmesi gereken tek
                        doğru rakam sellerSubtotal'dır — backend bunu bu yüzden ayrıca
                        hesaplayıp döner (bkz. order.service.ts toSellerOrderView). */}
                    <SubtotalBlock>
                      <SubtotalValue>{formatPrice(order.sellerSubtotal)}</SubtotalValue>
                      <SubtotalLabel>Sizin payınız</SubtotalLabel>
                    </SubtotalBlock>

                    {action && (
                      <Button
                        type="button"
                        onClick={() =>
                          setPendingAction({
                            order,
                            label: action.label,
                            nextStatus: action.nextStatus,
                            confirmText: action.confirmText,
                          })
                        }
                      >
                        {action.label}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </OrderList>

          <Pagination page={result.meta.page} totalPages={result.meta.totalPages} onPageChange={goToPage} />
        </>
      )}

      <Modal isOpen={pendingAction !== null} onClose={() => setPendingAction(null)} title={pendingAction?.label}>
        <ModalText>{pendingAction?.confirmText}</ModalText>
        <ModalActions>
          <Button type="button" variant="secondary" onClick={() => setPendingAction(null)}>
            Vazgeç
          </Button>
          <Button type="button" onClick={handleConfirmAction} isLoading={isUpdating}>
            Onayla
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}
