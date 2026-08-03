import { Link } from "react-router-dom";
import styled from "styled-components";

import { EmptyState } from "@/components/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { paths } from "@/routes/paths";

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const PrimaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.surface};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const SecondaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  font-weight: ${({ theme }) => theme.fontWeights.medium};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

export default function NotFoundPage() {
  usePageTitle("Sayfa Bulunamadı");

  return (
    <EmptyState
      titleAs="h1"
      icon="404"
      title="Sayfa Bulunamadı"
      description="Aradığınız sayfa kaldırılmış veya hiç var olmamış olabilir."
      action={
        <Actions>
          <PrimaryLink to={paths.HOME}>Ana Sayfa</PrimaryLink>
          <SecondaryLink to={paths.PRODUCTS}>Kataloğa Git</SecondaryLink>
        </Actions>
      }
    />
  );
}
