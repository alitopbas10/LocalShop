export const PRODUCT_CATEGORIES = [
  "food",
  "beverage",
  "handcraft",
  "textile",
  "cosmetics",
  "home",
  "other",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
