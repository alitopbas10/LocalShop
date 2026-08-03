import styled, { useTheme } from "styled-components";

import { CATEGORY_ACCENT, CATEGORY_LABELS } from "@/features/catalog/categoryPresentation";
import type { ProductCategory } from "@/types/models";

export interface ProductImageProps {
  imageUrl?: string;
  category: ProductCategory;
  alt: string;
  aspectRatio?: string;
}

const Frame = styled.div<{ $aspectRatio: string }>`
  width: 100%;
  aspect-ratio: ${({ $aspectRatio }) => $aspectRatio};
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
`;

const Photo = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

// Kırık resim ikonu yerine sade, kategoriye göre renklenmiş tipografik bir yer tutucu:
// imageUrl her zaman opsiyonel (satıcı görsel eklemek zorunda değil), bu yüzden bu
// durumun kullanıcıya "eksik/bozuk" değil "bu bir X kategorisi ürünü" hissi vermesi hedeflenir.
const Placeholder = styled.div<{ $accent: string }>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.md};
  text-align: center;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ $accent }) => $accent};
  background: ${({ theme, $accent }) => `color-mix(in srgb, ${$accent} 14%, ${theme.colors.surface})`};
`;

export default function ProductImage({ imageUrl, category, alt, aspectRatio = "4 / 3" }: ProductImageProps) {
  const theme = useTheme();
  const accent = theme.colors[CATEGORY_ACCENT[category]];

  return (
    <Frame $aspectRatio={aspectRatio}>
      {imageUrl ? (
        <Photo src={imageUrl} alt={alt} />
      ) : (
        <Placeholder $accent={accent}>{CATEGORY_LABELS[category]}</Placeholder>
      )}
    </Frame>
  );
}
