import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import styled from "styled-components";

import { Badge, Button, EmptyState, ErrorState, LoadingState, Modal, Pagination, Select } from "@/components/ui";
import ProductImage from "@/features/catalog/ProductImage";
import { CATEGORY_LABELS, CATEGORY_VALUES } from "@/features/catalog/categoryPresentation";
import { useApi } from "@/hooks/useApi";
import { useMutation } from "@/hooks/useMutation";
import { useToast } from "@/hooks/useToast";
import { paths, sellerProductEdit } from "@/routes/paths";
import { getErrorMessage } from "@/services/errorMessages";
import * as sellerProductService from "@/services/sellerProductService";
import type { SellerProductSort } from "@/services/sellerProductService";
import type { ProductCategory, SellerProduct } from "@/types/models";
import { formatPrice } from "@/utils/format";

const PAGE_LIMIT = 20;

const STATUS_FILTER_VALUES = ["all", "active", "inactive"] as const;
type StatusFilterValue = (typeof STATUS_FILTER_VALUES)[number];

function parseStatusFilter(value: string | null): StatusFilterValue {
  return value === "active" || value === "inactive" ? value : "all";
}

function statusFilterToIsActive(value: StatusFilterValue): boolean | undefined {
  if (value === "active") {
    return true;
  }
  if (value === "inactive") {
    return false;
  }
  return undefined;
}

const SORT_VALUES: SellerProductSort[] = ["newest", "oldest", "priceAsc", "priceDesc"];

function isSellerSort(value: string | null): value is SellerProductSort {
  return value !== null && (SORT_VALUES as string[]).includes(value);
}

const SORT_LABELS: Record<SellerProductSort, string> = {
  newest: "En Yeni",
  oldest: "En Eski",
  priceAsc: "Fiyat: Artan",
  priceDesc: "Fiyat: Azalan",
};

function isProductCategory(value: string | null): value is ProductCategory {
  return value !== null && (CATEGORY_VALUES as string[]).includes(value);
}

const CATEGORY_OPTIONS = [
  { value: "", label: "Tüm Kategoriler" },
  ...CATEGORY_VALUES.map((value) => ({ value, label: CATEGORY_LABELS[value] })),
];

const STATUS_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Pasif" },
];

const SORT_OPTIONS = SORT_VALUES.map((value) => ({ value, label: SORT_LABELS[value] }));

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
`;

const NewProductLink = styled(Link)`
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.surface};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  white-space: nowrap;
`;

const FiltersRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

// Gerçek bir <table> masaüstünde, kart listesi mobilde: ikisi de aynı veriden render
// edilir ama farklı görsel yapılar olduğu için (satır vs. kart) tek bir adaptif markup
// yerine iki ayrı markup tutulur, CSS ile hangisinin görüneceği seçilir.
const TableWrapper = styled.div`
  display: none;
  overflow-x: auto;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};

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
  vertical-align: middle;
`;

const RowThumb = styled.div`
  width: 3rem;
`;

const StockValue = styled.span<{ $empty: boolean }>`
  color: ${({ theme, $empty }) => ($empty ? theme.colors.danger : theme.colors.text)};
  font-weight: ${({ theme, $empty }) => ($empty ? theme.fontWeights.semibold : theme.fontWeights.regular)};
`;

const RowActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
`;

// Button bileşeni her zaman bir <button> render eder (polymorphic "as" desteği yok);
// "Düzenle" bir sayfa değişimi (navigasyon) olduğu için gerçek bir <a> (Link) olmalı,
// bu yüzden Button'ın "secondary"/"sm" görünümünü taklit eden ayrı bir styled(Link).
const EditLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.md}`};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const CardListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none;
  }
`;

const ProductCardItem = styled.div<{ $outOfStock: boolean }>`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme, $outOfStock }) => ($outOfStock ? theme.colors.danger : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const CardThumb = styled.div`
  width: 4.5rem;
  flex-shrink: 0;
`;

const CardBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const CardHeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const CardName = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const CardMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.fontSizes.sm};
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

export default function SellerProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const [targetProduct, setTargetProduct] = useState<SellerProduct | null>(null);

  // Filtre durumu URL'de tutulur: sayfa yenilendiğinde filtreler kaybolmaz, link
  // paylaşılabilir, geri tuşu çalışır (katalog/sipariş listelerindeki aynı gerekçe).
  const categoryParam = searchParams.get("category");
  const category = isProductCategory(categoryParam) ? categoryParam : undefined;
  const statusFilter = parseStatusFilter(searchParams.get("status"));
  const sortParam = searchParams.get("sort");
  const sort = isSellerSort(sortParam) ? sortParam : "newest";
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
    // Filtre değişince sayfa 1'e dönülür: mevcut sayfa yeni filtrede boş kalabilir.
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
    () =>
      sellerProductService.list({
        page,
        limit: PAGE_LIMIT,
        category,
        isActive: statusFilterToIsActive(statusFilter),
        sort,
      }),
    [page, category, statusFilter, sort],
  );

  const { mutate: toggleActive, isLoading: isToggling } = useMutation((product: SellerProduct) =>
    product.isActive ? sellerProductService.deactivate(product._id) : sellerProductService.activate(product._id),
  );

  async function handleConfirmToggle() {
    if (!targetProduct) {
      return;
    }
    const wasActive = targetProduct.isActive;
    try {
      await toggleActive(targetProduct);
      showToast(wasActive ? "Ürün pasifleştirildi." : "Ürün aktifleştirildi.", "success");
      setTargetProduct(null);
      refetch();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  return (
    <div>
      <HeaderRow>
        <Title>Ürünlerim</Title>
        <NewProductLink to={paths.SELLER_PRODUCT_NEW}>Yeni Ürün Ekle</NewProductLink>
      </HeaderRow>

      <FiltersRow>
        <Select
          label="Kategori"
          options={CATEGORY_OPTIONS}
          value={category ?? ""}
          onChange={(event) => updateParams({ category: event.target.value || undefined })}
        />
        <Select
          label="Durum"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(event) => updateParams({ status: event.target.value === "all" ? undefined : event.target.value })}
        />
        <Select
          label="Sırala"
          options={SORT_OPTIONS}
          value={sort}
          onChange={(event) => updateParams({ sort: event.target.value === "newest" ? undefined : event.target.value })}
        />
      </FiltersRow>

      {isLoading && <LoadingState message="Ürünler yükleniyor..." />}

      {!isLoading && error !== null && <ErrorState error={error} onRetry={refetch} />}

      {!isLoading && error === null && result && result.data.length === 0 && (
        <EmptyState
          title="Henüz ürün eklemediniz"
          description="Kataloğunuzu oluşturmaya ilk ürününüzü ekleyerek başlayın."
          action={<NewProductLink to={paths.SELLER_PRODUCT_NEW}>İlk ürününü ekle</NewProductLink>}
        />
      )}

      {!isLoading && error === null && result && result.data.length > 0 && (
        <>
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th></Th>
                  <Th>Ad</Th>
                  <Th>Kategori</Th>
                  <Th>Fiyat</Th>
                  <Th>Stok</Th>
                  <Th>Durum</Th>
                  <Th>Aksiyonlar</Th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((product) => (
                  <tr key={product._id}>
                    <Td>
                      <RowThumb>
                        <ProductImage imageUrl={product.imageUrl} category={product.category} alt={product.name} />
                      </RowThumb>
                    </Td>
                    <Td>{product.name}</Td>
                    <Td>{CATEGORY_LABELS[product.category]}</Td>
                    <Td>{formatPrice(product.price)}</Td>
                    <Td>
                      <StockValue $empty={product.stock === 0}>{product.stock}</StockValue>
                    </Td>
                    <Td>
                      <Badge variant={product.isActive ? "success" : "neutral"}>
                        {product.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </Td>
                    <Td>
                      <RowActions>
                        <EditLink to={sellerProductEdit(product._id)}>Düzenle</EditLink>
                        <Button
                          type="button"
                          variant={product.isActive ? "danger" : "secondary"}
                          size="sm"
                          onClick={() => setTargetProduct(product)}
                        >
                          {product.isActive ? "Pasifleştir" : "Aktifleştir"}
                        </Button>
                      </RowActions>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>

          <CardListWrapper>
            {result.data.map((product) => (
              <ProductCardItem key={product._id} $outOfStock={product.stock === 0}>
                <CardThumb>
                  <ProductImage imageUrl={product.imageUrl} category={product.category} alt={product.name} />
                </CardThumb>
                <CardBody>
                  <CardHeaderRow>
                    <CardName>{product.name}</CardName>
                    <Badge variant={product.isActive ? "success" : "neutral"}>
                      {product.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                  </CardHeaderRow>
                  <CardMeta>
                    <span>{CATEGORY_LABELS[product.category]}</span>
                    <span>{formatPrice(product.price)}</span>
                    <StockValue $empty={product.stock === 0}>{product.stock} adet</StockValue>
                  </CardMeta>
                  <RowActions>
                    <EditLink to={sellerProductEdit(product._id)}>Düzenle</EditLink>
                    <Button
                      type="button"
                      variant={product.isActive ? "danger" : "secondary"}
                      size="sm"
                      onClick={() => setTargetProduct(product)}
                    >
                      {product.isActive ? "Pasifleştir" : "Aktifleştir"}
                    </Button>
                  </RowActions>
                </CardBody>
              </ProductCardItem>
            ))}
          </CardListWrapper>

          <Pagination page={result.meta.page} totalPages={result.meta.totalPages} onPageChange={goToPage} />
        </>
      )}

      <Modal
        isOpen={targetProduct !== null}
        onClose={() => setTargetProduct(null)}
        title={targetProduct?.isActive ? "Ürünü pasifleştir" : "Ürünü aktifleştir"}
      >
        <ModalText>
          {targetProduct?.isActive
            ? "Ürün katalogdan kaldırılacak, mevcut siparişleriniz etkilenmeyecek."
            : "Ürün tekrar katalogda görünür olacak."}
        </ModalText>
        <ModalActions>
          <Button type="button" variant="secondary" onClick={() => setTargetProduct(null)}>
            Vazgeç
          </Button>
          <Button
            type="button"
            variant={targetProduct?.isActive ? "danger" : "primary"}
            onClick={handleConfirmToggle}
            isLoading={isToggling}
          >
            {targetProduct?.isActive ? "Pasifleştir" : "Aktifleştir"}
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}
