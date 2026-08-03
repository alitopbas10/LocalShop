import { Link } from "react-router-dom";
import styled from "styled-components";

import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Card, ErrorState, LoadingState } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { paths } from "@/routes/paths";
import * as sellerOrderService from "@/services/sellerOrderService";
import * as sellerProductService from "@/services/sellerProductService";
import type { SellerOrder } from "@/types/models";
import { formatDate, formatPrice } from "@/utils/format";

const RECENT_ORDER_COUNT = 5;

interface DashboardData {
  totalProducts: number;
  activeProducts: number;
  incomingOrders: number;
  pendingOrders: number;
  recentOrders: SellerOrder[];
}

// Yalnızca meta.total okumak için limit=1 gönderilir: tüm listeyi çekip uzunluğunu
// saymak (ör. limit=100 ile) gereksiz bir veri transferi olurdu — burada tek ihtiyacımız
// olan sayı zaten backend'in pagination meta'sında hazır geliyor. Yeni bir "sayım"
// endpoint'i eklemeye gerek yok, mevcut liste uçları bunun için yeterli.
async function fetchDashboardData(): Promise<DashboardData> {
  const [totalProducts, activeProducts, incomingOrders, pendingOrders, recent] = await Promise.all([
    sellerProductService.list({ limit: 1 }),
    sellerProductService.list({ limit: 1, isActive: true }),
    sellerOrderService.listIncoming({ limit: 1 }),
    sellerOrderService.listIncoming({ limit: 1, fulfillmentStatus: "PENDING" }),
    sellerOrderService.listIncoming({ limit: RECENT_ORDER_COUNT, sort: "newest" }),
  ]);

  return {
    totalProducts: totalProducts.meta.total,
    activeProducts: activeProducts.meta.total,
    incomingOrders: incomingOrders.meta.total,
    pendingOrders: pendingOrders.meta.total,
    recentOrders: recent.data,
  };
}

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.xl};

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatValue = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.xxl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text};
`;

const StatLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const QuickActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const PrimaryLink = styled(Link)`
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.surface};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const SecondaryLink = styled(Link)`
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const RecentOrderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-wrap: wrap;

  &:last-child {
    border-bottom: none;
  }
`;

const OrderInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const OrderNumber = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const OrderMeta = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const OrderRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const OrderTotal = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const EmptyText = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

export default function SellerDashboardPage() {
  const { data, error, isLoading, refetch } = useApi(fetchDashboardData, []);

  if (isLoading) {
    return <LoadingState message="Panel yükleniyor..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (!data) {
    return null;
  }

  return (
    <div>
      <Title>Satıcı Paneli</Title>

      <StatGrid>
        <Card padding="lg">
          <StatValue>{data.totalProducts}</StatValue>
          <StatLabel>Toplam Ürün</StatLabel>
        </Card>
        <Card padding="lg">
          <StatValue>{data.activeProducts}</StatValue>
          <StatLabel>Aktif Ürün</StatLabel>
        </Card>
        <Card padding="lg">
          <StatValue>{data.incomingOrders}</StatValue>
          <StatLabel>Gelen Sipariş</StatLabel>
        </Card>
        <Card padding="lg">
          <StatValue>{data.pendingOrders}</StatValue>
          <StatLabel>Hazırlanmayı Bekleyen</StatLabel>
        </Card>
      </StatGrid>

      <QuickActions>
        <PrimaryLink to={paths.SELLER_PRODUCT_NEW}>Yeni Ürün Ekle</PrimaryLink>
        <SecondaryLink to={paths.SELLER_ORDERS}>Siparişleri Görüntüle</SecondaryLink>
      </QuickActions>

      <SectionTitle>Son Siparişler</SectionTitle>
      <Card padding="lg">
        {data.recentOrders.length === 0 ? (
          <EmptyText>Henüz gelen sipariş yok.</EmptyText>
        ) : (
          data.recentOrders.map((order) => (
            <RecentOrderRow key={order._id}>
              <OrderInfo>
                <OrderNumber>{order.orderNumber}</OrderNumber>
                <OrderMeta>
                  {formatDate(order.createdAt)} · {order.buyer.name ?? "Bilinmeyen alıcı"} · {order.itemCount} ürün
                </OrderMeta>
              </OrderInfo>
              <OrderRight>
                <OrderTotal>{formatPrice(order.sellerSubtotal)}</OrderTotal>
                <OrderStatusBadge status={order.status} />
              </OrderRight>
            </RecentOrderRow>
          ))
        )}
      </Card>
    </div>
  );
}
