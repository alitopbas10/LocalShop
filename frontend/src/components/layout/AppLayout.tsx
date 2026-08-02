import { Outlet } from "react-router-dom";
import styled from "styled-components";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

const Main = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.md};
  }
`;

export default function AppLayout() {
  return (
    <>
      <Header />
      <Main>
        <Outlet />
      </Main>
      <Footer />
    </>
  );
}
