import styled from "styled-components";

const Bar = styled.footer`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.lg};
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

export default function Footer() {
  const year = new Date().getFullYear();
  return <Bar>LocalShop &copy; {year}</Bar>;
}
