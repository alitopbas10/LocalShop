import { Link, useNavigate, useSearchParams } from "react-router-dom";
import styled from "styled-components";

import {
  ORDER_STATUS_LABELS,
  OrderStatusBadge,
  PAYABLE_ORDER_STATUSES,
} from "@/components/orders/OrderStatusBadge";
import { Button, Card, EmptyState, ErrorState, LoadingState, Pagination } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { usePageTitle } from "@/hooks/usePageTitle";
import { orderDetail, payment, paths } from "@/routes/paths";
import * as orderService from "@/services/orderService";
import type { Order, OrderStatus } from "@/types/models";
import { formatDate, formatPrice } from "@/utils/format";

const PAGE_LIMIT = 10;
const PREVIEW_ITEM_COUNT = 3;

const ORDER_STATUS_VALUES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

function isOrderStatus(value: string | null): value is OrderStatus {
  return value !== null && (ORDER_STATUS_VALUES as string[]).includes(value);
}

// PAYMENT_FAILED bilinçli olarak kendi sekmesi değil: bu durumdaki siparişler
// "Tümü"nde görünür, ayrı bir sekme açmak filtre listesini gereksiz uzatır.
const FILTER_TABS: { value: OrderStatus | undefined; label: string }[] = [
  { value: undefined, label: "Tümü" },
  { value: "PENDING_PAYMENT", label: ORDER_STATUS_LABELS.PENDING_PAYMENT },
  { value: "PAID", label: ORDER_STATUS_LABELS.PAID },
  { value: "SHIPPED", label: ORDER_STATUS_LABELS.SHIPPED },
  { value: "DELIVERED", label: ORDER_STATUS_LABELS.DELIVERED },
  { value: "CANCELLED", label: ORDER_STATUS_LABELS.CANCELLED },
];

function buildItemsPreview(items: Order["items"]): string {
  const names = items.slice(0, PREVIEW_ITEM_COUNT).map((item) => item.name);
  const remaining = items.length - names.length;
  return remaining > 0 ? `${names.join(", ")} +${remaining} diğer` : names.join(", ");
}

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const TabRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.md}`};
  border-radius: ${({ theme }) => theme.radii.full};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.surface)};
  color: ${({ theme, $active }) => ($active ? theme.colors.surface : theme.colors.text)};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
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

const OrderDate = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ItemsPreview = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  margin: ${({ theme }) => theme.spacing.sm} 0;
`;

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Total = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.md};
`;

const CompleteButton = styled(Button)`
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const CatalogLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

export default function OrderListPage() {
  usePageTitle("Siparişlerim");

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filtre durumu URL'de tutulur (React state değil): sayfa yenilendiğinde filtre
  // kaybolmaz, link paylaşılabilir, geri tuşu çalışır — ProductListPage'deki aynı
  // gerekçe burada da geçerli.
  const statusParam = searchParams.get("status");
  const status = isOrderStatus(statusParam) ? statusParam : undefined;

  const pageParam = Number(searchParams.get("page"));
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1;

  function selectStatus(next: OrderStatus | undefined) {
    const params = new URLSearchParams(searchParams);
    if (next) {
      params.set("status", next);
    } else {
      params.delete("status");
    }
    // Filtre değişince sayfa 1'e dönülür: kullanıcı 3. sayfadayken filtre değiştirirse
    // yeni filtrede 3. sayfa muhtemelen boştur.
    params.set("page", "1");
    setSearchParams(params);
  }

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(nextPage));
    setSearchParams(params);
  }

  const {
    data: result,
    error,
    isLoading,
    refetch,
  } = useApi(() => orderService.listOrders({ page, limit: PAGE_LIMIT, status, sort: "newest" }), [page, status]);

  return (
    <div>
      <Title>Siparişlerim</Title>

      <TabRow role="tablist" aria-label="Sipariş durumu filtresi">
        {FILTER_TABS.map((tab) => (
          <TabButton
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            $active={status === tab.value}
            onClick={() => selectStatus(tab.value)}
          >
            {tab.label}
          </TabButton>
        ))}
      </TabRow>

      {isLoading && <LoadingState message="Siparişler yükleniyor..." />}

      {!isLoading && error !== null && <ErrorState error={error} onRetry={refetch} />}

      {!isLoading && error === null && result && result.data.length === 0 && (
        <EmptyState
          title="Henüz siparişiniz yok"
          description="Katalogdan alışverişe başlayarak ilk siparişinizi oluşturun."
          action={<CatalogLink to={paths.PRODUCTS}>Kataloğa git</CatalogLink>}
        />
      )}

      {!isLoading && error === null && result && result.data.length > 0 && (
        <>
          <OrderList>
            {result.data.map((order) => (
              <Card key={order._id} padding="lg">
                <CardHeader>
                  <OrderHeading>
                    <OrderNumberLink to={orderDetail(order._id)}>{order.orderNumber}</OrderNumberLink>
                    <OrderDate>{formatDate(order.createdAt)}</OrderDate>
                  </OrderHeading>
                  <OrderStatusBadge status={order.status} />
                </CardHeader>

                <ItemsPreview>{buildItemsPreview(order.items)}</ItemsPreview>

                <CardFooter>
                  <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} ürün</span>
                  <Total>{formatPrice(order.totalPrice)}</Total>
                </CardFooter>

                {PAYABLE_ORDER_STATUSES.includes(order.status) && (
                  <CompleteButton type="button" fullWidth onClick={() => navigate(payment(order._id))}>
                    Ödemeyi Tamamla
                  </CompleteButton>
                )}
              </Card>
            ))}
          </OrderList>

          <Pagination page={result.meta.page} totalPages={result.meta.totalPages} onPageChange={goToPage} />
        </>
      )}
    </div>
  );
}
