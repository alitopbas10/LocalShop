import styled from "styled-components";

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.primary};
  font-size: ${({ theme }) => theme.fontSizes.xxl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  padding: ${({ theme }) => theme.spacing.lg};
`;

function App() {
  return <Title>LocalShop</Title>;
}

export default App;
