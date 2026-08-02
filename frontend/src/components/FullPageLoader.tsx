import styled from "styled-components";

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.lg};
`;

export default function FullPageLoader() {
  return <Wrapper>Yükleniyor...</Wrapper>;
}
