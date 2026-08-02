import styled from "styled-components";

import Spinner from "@/components/ui/Spinner";

export interface LoadingStateProps {
  message?: string;
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.xxl} ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
`;

export default function LoadingState({ message }: LoadingStateProps) {
  return (
    <Wrapper>
      <Spinner size="lg" />
      {message && <p>{message}</p>}
    </Wrapper>
  );
}
