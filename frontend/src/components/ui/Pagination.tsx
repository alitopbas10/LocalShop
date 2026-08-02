import styled from "styled-components";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

type PageItem = number | "ellipsis-start" | "ellipsis-end";

// Çok sayfalı listelerde tüm sayfa numaralarını göstermek yerine mevcut sayfanın
// komşuları + ilk/son sayfa gösterilir, aradaki boşluklar "..." ile kısaltılır.
function buildPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PageItem[] = [1];
  const left = Math.max(2, page - 1);
  const right = Math.min(totalPages - 1, page + 1);

  if (left > 2) {
    items.push("ellipsis-start");
  }

  for (let i = left; i <= right; i += 1) {
    items.push(i);
  }

  if (right < totalPages - 1) {
    items.push("ellipsis-end");
  }

  items.push(totalPages);
  return items;
}

const Nav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const PageButton = styled.button<{ $active: boolean }>`
  min-width: 2rem;
  height: 2rem;
  padding: 0 ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.surface)};
  color: ${({ theme, $active }) => ($active ? theme.colors.surface : theme.colors.text)};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const Ellipsis = styled.span`
  padding: 0 ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const items = buildPageItems(page, totalPages);

  return (
    <Nav aria-label="Sayfalama">
      <PageButton
        type="button"
        $active={false}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Önceki sayfa"
      >
        ‹
      </PageButton>

      {items.map((item, index) =>
        typeof item === "number" ? (
          <PageButton
            key={item}
            type="button"
            $active={item === page}
            aria-current={item === page ? "page" : undefined}
            onClick={() => onPageChange(item)}
          >
            {item}
          </PageButton>
        ) : (
          <Ellipsis key={`${item}-${index}`} aria-hidden="true">
            …
          </Ellipsis>
        ),
      )}

      <PageButton
        type="button"
        $active={false}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Sonraki sayfa"
      >
        ›
      </PageButton>
    </Nav>
  );
}
