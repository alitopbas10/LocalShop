import styled from "styled-components";

import { FulfillmentStatusBadge } from "@/components/orders/OrderStatusBadge";
import type { FulfillmentStatus, OrderItem } from "@/types/models";
import { formatPrice } from "@/utils/format";

export interface OrderItemsTableProps {
  items: OrderItem[];
  sellerIds: string[];
}

interface SellerGroup {
  sellerId: string;
  label: string;
  items: OrderItem[];
  fulfillmentStatus: FulfillmentStatus;
}

function groupBySeller(items: OrderItem[], sellerIds: string[]): SellerGroup[] {
  return sellerIds.map((sellerId, index) => {
    const sellerItems = items.filter((item) => item.sellerId === sellerId);
    return {
      sellerId,
      // Satıcı adı bu görünümde YOK (backend bilinçli olarak eklemiyor, bkz.
      // order.service.ts toOrderView — müşteri tarafında gösterilmesine gerek yok);
      // gruplar bu yüzden sıra numarasıyla etiketlenir.
      label: `Satıcı ${index + 1}`,
      items: sellerItems,
      // Bir satıcının kendi satırları her zaman BİRLİKTE güncellenir
      // (updateFulfillmentStatus, order.service.ts aynı anda hepsine aynı durumu yazar),
      // bu yüzden grup içindeki ilk satırın durumu tüm grubu güvenle temsil eder.
      fulfillmentStatus: sellerItems[0]?.fulfillmentStatus ?? "PENDING",
    };
  });
}

// Gerçek bir <table> masaüstünde, kart listesi mobilde: ikisi de aynı veriden render
// edilir ama farklı görsel yapılar olduğu için (satır vs. kart) tek bir adaptif markup
// yerine iki ayrı markup tutulur, CSS ile hangisinin görüneceği seçilir (bkz.
// SellerProductListPage.tsx'teki aynı desen).
const TableWrapper = styled.div`
  display: none;
  overflow-x: auto;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: block;
  }
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

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none;
  }
`;

const ItemCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const ItemCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ItemCardName = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const ItemCardMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ItemCardTotal = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const SellerGroupBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};

  & + & {
    margin-top: ${({ theme }) => theme.spacing.lg};
  }
`;

const SellerGroupHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SellerLabel = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

interface ItemsTableProps {
  items: OrderItem[];
  showRowStatus: boolean;
}

function ItemsTable({ items, showRowStatus }: ItemsTableProps) {
  return (
    <>
      <TableWrapper>
        <Table>
          <thead>
            <tr>
              <Th>Ürün</Th>
              <Th>Birim Fiyat</Th>
              <Th>Adet</Th>
              <Th>Satır Toplamı</Th>
              {showRowStatus && <Th>Durum</Th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.productId}>
                {/* Ürün adı SNAPSHOT'tır, güncel üründen gelmez — bilerek link yapılmadı.
                    Ürün silinmiş ya da satıcı tarafından pasifleştirilmiş olabilir; bir
                    link koymak isteyen biri çıkarsa bu yorumu görsün: sonuç ya 404 ya da
                    yanlış (güncel) bir fiyat/ad gösteren bir sayfa olur, ikisi de burada
                    anlamsızdır. */}
                <Td>{item.name}</Td>
                <Td>{formatPrice(item.price)}</Td>
                <Td>{item.quantity}</Td>
                <Td>{formatPrice(item.lineTotal)}</Td>
                {showRowStatus && (
                  <Td>
                    <FulfillmentStatusBadge status={item.fulfillmentStatus} />
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrapper>

      <CardList>
        {items.map((item) => (
          <ItemCard key={item.productId}>
            <ItemCardHeader>
              <ItemCardName>{item.name}</ItemCardName>
              {showRowStatus && <FulfillmentStatusBadge status={item.fulfillmentStatus} />}
            </ItemCardHeader>
            <ItemCardMeta>
              <span>
                {formatPrice(item.price)} × {item.quantity}
              </span>
              <ItemCardTotal>{formatPrice(item.lineTotal)}</ItemCardTotal>
            </ItemCardMeta>
          </ItemCard>
        ))}
      </CardList>
    </>
  );
}

// Tek satıcılı bir siparişte gruplama gösterilmez (gereksiz karmaşa); satır durumu
// doğrudan tablo satırında görünür. Çok satıcılı bir siparişte satırlar satıcıya göre
// bölünür, durum grup başlığında bir kez gösterilir (satır başına tekrarlanmaz, çünkü
// bir grubun içindeki tüm satırlar zaten aynı durumu paylaşır).
export default function OrderItemsTable({ items, sellerIds }: OrderItemsTableProps) {
  if (sellerIds.length <= 1) {
    return <ItemsTable items={items} showRowStatus />;
  }

  return (
    <div>
      {groupBySeller(items, sellerIds).map((group) => (
        <SellerGroupBlock key={group.sellerId}>
          <SellerGroupHeader>
            <SellerLabel>{group.label}</SellerLabel>
            <FulfillmentStatusBadge status={group.fulfillmentStatus} />
          </SellerGroupHeader>
          <ItemsTable items={group.items} showRowStatus={false} />
        </SellerGroupBlock>
      ))}
    </div>
  );
}
