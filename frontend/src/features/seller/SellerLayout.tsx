import { Link, Outlet, useLocation } from "react-router-dom";
import styled from "styled-components";

import { paths } from "@/routes/paths";

interface NavItemDef {
  to: string;
  label: string;
  match: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItemDef[] = [
  { to: paths.SELLER_DASHBOARD, label: "Panel", match: (pathname) => pathname === paths.SELLER_DASHBOARD },
  {
    to: paths.SELLER_PRODUCTS,
    label: "Ürünlerim",
    match: (pathname) => pathname.startsWith(paths.SELLER_PRODUCTS),
  },
  {
    to: paths.SELLER_ORDERS,
    label: "Siparişler",
    match: (pathname) => pathname.startsWith(paths.SELLER_ORDERS),
  },
];

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: row;
    align-items: flex-start;
  }
`;

const Nav = styled.nav`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  overflow-x: auto;

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: column;
    width: 200px;
    flex-shrink: 0;
  }
`;

const NavItem = styled(Link)<{ $active: boolean }>`
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  border-radius: ${({ theme }) => theme.radii.md};
  font-weight: ${({ theme, $active }) => ($active ? theme.fontWeights.semibold : theme.fontWeights.medium)};
  color: ${({ theme, $active }) => ($active ? theme.colors.surface : theme.colors.text)};
  background: ${({ theme, $active }) => ($active ? theme.colors.primary : "transparent")};
  white-space: nowrap;

  &:hover {
    background: ${({ theme, $active }) => ($active ? theme.colors.primaryDark : theme.colors.background)};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

// /seller altındaki tüm sayfaları (Panel/Ürünlerim/Siparişler) sarar; route yapısında
// ProtectedRoute'un içinde, Outlet'in etrafında kullanılır (bkz. AppRouter.tsx).
export default function SellerLayout() {
  const location = useLocation();

  return (
    <Layout>
      <Nav aria-label="Satıcı paneli navigasyonu">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} to={item.to} $active={item.match(location.pathname)}>
            {item.label}
          </NavItem>
        ))}
      </Nav>
      <Content>
        <Outlet />
      </Content>
    </Layout>
  );
}
