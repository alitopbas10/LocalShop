import type { Theme } from "@/styles/theme";
import type { ProductCategory } from "@/types/models";

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  food: "Gıda",
  beverage: "İçecek",
  handcraft: "El Sanatları",
  textile: "Tekstil",
  cosmetics: "Kozmetik",
  home: "Ev & Yaşam",
  other: "Diğer",
};

// Görseli olmayan ürünler için kategoriye göre farklı bir vurgu rengi seçilir; böylece
// tipografik yer tutucu kategoriler arasında da ayırt edici kalır, hepsi aynı gri kutu
// olmaz. Yeni bir renk seti icat edilmez, mevcut theme.colors'tan seçilir.
export const CATEGORY_ACCENT: Record<ProductCategory, keyof Theme["colors"]> = {
  food: "success",
  beverage: "info",
  handcraft: "secondary",
  textile: "warning",
  cosmetics: "primary",
  home: "textMuted",
  other: "textMuted",
};

export const CATEGORY_VALUES = Object.keys(CATEGORY_LABELS) as ProductCategory[];
