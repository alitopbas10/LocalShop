import styled from "styled-components";

import { Button } from "@/components/ui";
import { useCart } from "@/hooks/useCart";
import { useMutation } from "@/hooks/useMutation";
import { useToast } from "@/hooks/useToast";
import { getErrorMessage } from "@/services/errorMessages";
import type { CartIssue } from "@/types/models";

export interface CartIssuesBannerProps {
  issues: CartIssue[];
}

const Banner = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.danger};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => `color-mix(in srgb, ${theme.colors.danger} 8%, ${theme.colors.surface})`};
`;

const Title = styled.p`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.danger};
`;

const IssueRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

const IssueMessage = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

function formatIssueMessage(issue: CartIssue): string {
  if (issue.issue === "PRODUCT_UNAVAILABLE") {
    return `${issue.productName} artık satışta değil`;
  }
  return `${issue.productName} için yeterli stok yok (istenen: ${issue.requested}, mevcut: ${issue.available})`;
}

interface IssueFixButtonProps {
  issue: CartIssue;
}

// Kullanıcıya sadece sorunu bildirmek yetmez, çözümü tek tıkla sunmak gerekir: ürün
// tamamen satıştan kalktıysa tek mantıklı çözüm sepetten çıkarmaktır; stok yetersizse
// adedi mevcut stoğa düşürmek üçüncü bir isteğe gerek bırakmadan sorunu çözer.
function IssueFixButton({ issue }: IssueFixButtonProps) {
  const { removeItem, updateItem } = useCart();
  const { showToast } = useToast();

  const { mutate: fix, isLoading } = useMutation(async () => {
    if (issue.issue === "PRODUCT_UNAVAILABLE") {
      await removeItem(issue.productId);
    } else {
      await updateItem(issue.productId, issue.available);
    }
  });

  async function handleClick() {
    try {
      await fix();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleClick} isLoading={isLoading}>
      {issue.issue === "PRODUCT_UNAVAILABLE" ? "Sepetten çıkar" : `Adedi ${issue.available} yap`}
    </Button>
  );
}

export default function CartIssuesBanner({ issues }: CartIssuesBannerProps) {
  return (
    <Banner role="alert">
      <Title>Sepetinizde sorunlu ürünler var</Title>
      {issues.map((issue) => (
        <IssueRow key={issue.productId}>
          <IssueMessage>{formatIssueMessage(issue)}</IssueMessage>
          <IssueFixButton issue={issue} />
        </IssueRow>
      ))}
    </Banner>
  );
}
