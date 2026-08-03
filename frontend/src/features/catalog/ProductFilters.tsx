import { useEffect, useState } from "react";
import styled from "styled-components";

import { Button, Input, Select, type SelectOption } from "@/components/ui";
import { CATEGORY_LABELS } from "@/features/catalog/categoryPresentation";
import PriceRangeField from "@/features/catalog/PriceRangeField";
import { useApi } from "@/hooks/useApi";
import { useDebounce } from "@/hooks/useDebounce";
import { getCategories, type CatalogSort } from "@/services/catalogService";
import type { ProductCategory } from "@/types/models";

export interface CatalogFilters {
  search: string;
  category?: ProductCategory;
  minPrice?: number;
  maxPrice?: number;
  sort: CatalogSort;
}

export function hasActiveCatalogFilters(filters: CatalogFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.category !== undefined ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined
  );
}

export interface ProductFiltersProps {
  value: CatalogFilters;
  onChange: (patch: Partial<CatalogFilters>) => void;
  onClear: () => void;
}

const SORT_LABELS: { value: CatalogSort; label: string }[] = [
  { value: "newest", label: "En Yeni" },
  { value: "priceAsc", label: "Fiyat: Artan" },
  { value: "priceDesc", label: "Fiyat: Azalan" },
  { value: "relevance", label: "İlgi Düzeyi" },
];

// Mobilde tek sütun (her alan alt alta), tablette 2 sütun, masaüstünde tüm alanlar +
// temizle butonu tek satırda hizalı durur. align-items: end, etiketsiz "Filtreleri
// temizle" butonunun (ve farklı yükseklikteki fiyat aralığı alanının) input kutularıyla
// aynı alt çizgide durmasını sağlar.
const Panel = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: 1.1fr 1fr 1.6fr 1fr auto;
    align-items: end;
  }
`;

export default function ProductFilters({ value, onChange, onClear }: ProductFiltersProps) {
  const { data: categories } = useApi(getCategories, []);

  const [searchText, setSearchText] = useState(value.search);
  const debouncedSearch = useDebounce(searchText, 400);

  // Yazarken her tuş vuruşunda URL'e/backend'e istek atmamak için arama önce yerel
  // state'te tutulur; 400ms sessizlik sonrası üst bileşene (ve dolayısıyla URL'e)
  // bildirilir. value.search ile karşılaştırma, kendi tetiklediğimiz güncellemenin geri
  // döngü yapıp gereksiz bir onChange daha üretmesini engeller.
  useEffect(() => {
    if (debouncedSearch !== value.search) {
      onChange({ search: debouncedSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Dışarıdan bir değişiklik olursa (ör. "Filtreleri temizle", tarayıcı geri/ileri tuşu)
  // yerel input metni URL'deki gerçek değere göre yeniden senkronlanır.
  useEffect(() => setSearchText(value.search), [value.search]);

  // Backend, arama terimi olmadan sort=relevance gönderilirse 400 döner (bkz.
  // catalog.schemas.ts refine kuralı); bu yüzden seçenek burada arama terimi yokken
  // devre dışı bırakılır, kullanıcı hiç geçersiz bir kombinasyon kuramaz.
  const canUseRelevance = value.search.trim() !== "";
  const sortOptions: SelectOption[] = SORT_LABELS.map((option) => ({
    value: option.value,
    label: option.label,
    disabled: option.value === "relevance" && !canUseRelevance,
  }));

  const categoryOptions: SelectOption[] = [
    { value: "", label: "Tüm Kategoriler" },
    ...(categories ?? []).map((category) => ({
      value: category.value,
      label: `${CATEGORY_LABELS[category.value]} (${category.count})`,
    })),
  ];

  return (
    <Panel>
      <Input
        label="Ara"
        placeholder="Ürün ara..."
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
      />

      <Select
        label="Kategori"
        options={categoryOptions}
        value={value.category ?? ""}
        onChange={(event) =>
          onChange({
            category: event.target.value === "" ? undefined : (event.target.value as ProductCategory),
          })
        }
      />

      <PriceRangeField minPrice={value.minPrice} maxPrice={value.maxPrice} onChange={onChange} />

      <Select
        label="Sırala"
        options={sortOptions}
        value={value.sort}
        onChange={(event) => onChange({ sort: event.target.value as CatalogSort })}
      />

      {hasActiveCatalogFilters(value) && (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Filtreleri temizle
        </Button>
      )}
    </Panel>
  );
}
