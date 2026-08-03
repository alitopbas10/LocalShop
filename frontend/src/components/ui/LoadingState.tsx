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
      {/* Spinner'ın kendi role="status" bölgesine sayfa-özel mesaj (varsa) label olarak
          verilir; aksi halde ekran okuyucu yalnızca jenerik "Yükleniyor" duyurur, altındaki
          görünür <p> (canlı bölgenin dışında olduğu için) hiç duyurulmazdı. */}
      <Spinner size="lg" label={message ?? "Yükleniyor"} />
      {message && <p>{message}</p>}
    </Wrapper>
  );
}
