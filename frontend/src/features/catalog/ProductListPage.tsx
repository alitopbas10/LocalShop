import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import styled from "styled-components";

import { Button, EmptyState, ErrorState, LoadingState, Pagination } from "@/components/ui";
import ProductCard from "@/features/catalog/ProductCard";
import ProductFilters, { hasActiveCatalogFilters, type CatalogFilters } from "@/features/catalog/ProductFilters";
import { useApi } from "@/hooks/useApi";
import * as catalogService from "@/services/catalogService";
import type { CatalogSort } from "@/services/catalogService";
import { CATEGORY_VALUES } from "@/features/catalog/categoryPresentation";
import type { ProductCategory } from "@/types/models";

const PAGE_LIMIT = 20;
const DEFAULT_SORT: CatalogSort = "newest";
const CATALOG_SORT_VALUES: readonly CatalogSort[] = ["newest", "priceAsc", "priceDesc", "relevance"];

interface ParsedFilters extends CatalogFilters {
  page: number;
}

function isProductCategory(value: string | null): value is ProductCategory {
  return value !== null && (CATEGORY_VALUES as string[]).includes(value);
}

function isCatalogSort(value: string | null): value is CatalogSort {
  return value !== null && (CATALOG_SORT_VALUES as string[]).includes(value);
}

function parseFilters(searchParams: URLSearchParams): ParsedFilters {
  const pageRaw = Number(searchParams.get("page"));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  const categoryRaw = searchParams.get("category");
  const sortRaw = searchParams.get("sort");
  const minPriceRaw = searchParams.get("minPrice");
  const maxPriceRaw = searchParams.get("maxPrice");

  return {
    page,
    search: searchParams.get("search") ?? "",
    category: isProductCategory(categoryRaw) ? categoryRaw : undefined,
    minPrice: minPriceRaw !== null && minPriceRaw !== "" ? Number(minPriceRaw) : undefined,
    maxPrice: maxPriceRaw !== null && maxPriceRaw !== "" ? Number(maxPriceRaw) : undefined,
    sort: isCatalogSort(sortRaw) ? sortRaw : DEFAULT_SORT,
  };
}

// ProductFilters kendi içinde masaüstünde yatay bir çubuğa dönüşür (bkz.
// ProductFilters.tsx); bu yüzden burada dar bir kenar çubuğuna sıkıştırılmaz, sonuçların
// üstünde tam genişlikte durur.
const Layout = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const ResultsColumn = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const ResultsSummary = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing.lg};

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 1280px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Filtre durumu React state'inde DEĞİL, URL'de tutulur: sayfa yenilendiğinde filtreler
  // kaybolmaz, link olduğu gibi paylaşılabilir, tarayıcının geri/ileri tuşları çalışır.
  // searchParams tek kaynak, filters ondan türetilir; ayrı bir state ikisinin
  // birbirinden sapması (senkronizasyon hatası) riskini baştan ortadan kaldırır.
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  function updateFilters(patch: Partial<CatalogFilters>) {
    const next = new URLSearchParams(searchParams);

    if ("search" in patch) {
      if (!patch.search) {
        next.delete("search");
      } else {
        next.set("search", patch.search);
      }
    }
    if ("category" in patch) {
      if (!patch.category) {
        next.delete("category");
      } else {
        next.set("category", patch.category);
      }
    }
    if ("minPrice" in patch) {
      if (patch.minPrice === undefined) {
        next.delete("minPrice");
      } else {
        next.set("minPrice", String(patch.minPrice));
      }
    }
    if ("maxPrice" in patch) {
      if (patch.maxPrice === undefined) {
        next.delete("maxPrice");
      } else {
        next.set("maxPrice", String(patch.maxPrice));
      }
    }
    if ("sort" in patch) {
      if (!patch.sort || patch.sort === DEFAULT_SORT) {
        next.delete("sort");
      } else {
        next.set("sort", patch.sort);
      }
    }

    // relevance sıralaması yalnızca bir arama terimi varken geçerlidir (bkz.
    // catalog.schemas.ts); arama alanı bu patch ile boşaltılıyorsa sort da sessizce
    // "newest"e döner, aksi halde backend'e 400 döndürecek bir kombinasyon gönderilir.
    const effectiveSearch = "search" in patch ? patch.search : filters.search;
    const effectiveSort = "sort" in patch ? patch.sort : filters.sort;
    if (effectiveSort === "relevance" && !effectiveSearch) {
      next.delete("sort");
    }

    // Filtre değişince her zaman sayfa 1'e dönülür: kullanıcı 5. sayfadayken kategori
    // değiştirirse, yeni filtreyle 5. sayfa muhtemelen boştur.
    next.set("page", "1");
    setSearchParams(next);
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams());
  }

  function goToPage(page: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    setSearchParams(next);
  }

  const { data: result, error, isLoading, refetch } = useApi(
    () =>
      catalogService.listProducts({
        page: filters.page,
        limit: PAGE_LIMIT,
        category: filters.category,
        search: filters.search.trim() === "" ? undefined : filters.search.trim(),
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        sort: filters.sort,
      }),
    [filters.page, filters.category, filters.search, filters.minPrice, filters.maxPrice, filters.sort],
  );

  const activeFiltersPresent = hasActiveCatalogFilters(filters);

  return (
    <div>
      <Title>Ürün Kataloğu</Title>
      <Layout>
        <ProductFilters value={filters} onChange={updateFilters} onClear={clearFilters} />

        <ResultsColumn>
          {isLoading && <LoadingState message="Ürünler yükleniyor..." />}

          {!isLoading && error !== null && <ErrorState error={error} onRetry={refetch} />}

          {!isLoading && !error && result && result.data.length === 0 && activeFiltersPresent && (
            <EmptyState
              title="Filtrelerinizle eşleşen ürün yok"
              description="Farklı bir arama terimi veya filtre kombinasyonu deneyin."
              action={
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Filtreleri temizle
                </Button>
              }
            />
          )}

          {!isLoading && !error && result && result.data.length === 0 && !activeFiltersPresent && (
            <EmptyState title="Henüz ürün yok" description="Yakında burada yeni ürünler olacak." />
          )}

          {!isLoading && !error && result && result.data.length > 0 && (
            <>
              <ResultsSummary>
                {result.meta.total} üründen {(result.meta.page - 1) * result.meta.limit + 1}-
                {Math.min(result.meta.page * result.meta.limit, result.meta.total)} arası
              </ResultsSummary>

              <Grid>
                {result.data.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </Grid>

              <Pagination page={result.meta.page} totalPages={result.meta.totalPages} onPageChange={goToPage} />
            </>
          )}
        </ResultsColumn>
      </Layout>
    </div>
  );
}
