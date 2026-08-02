import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";

import { useAuth } from "@/hooks/useAuth";
import { paths } from "@/routes/paths";
import type { UserRole } from "@/types/models";

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.lg};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
    gap: ${({ theme }) => theme.spacing.sm};
  }
`;

const Brand = styled(Link)`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.primary};
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  flex: 1;
`;

const NavLink = styled(Link)`
  color: ${({ theme }) => theme.colors.text};
  font-weight: ${({ theme }) => theme.fontWeights.medium};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none;
  }
`;

const IconLink = styled(Link)`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  border-radius: ${({ theme }) => theme.radii.full};

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }
`;

const CartBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.colors.secondary};
  color: ${({ theme }) => theme.colors.surface};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const AuthSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const UserName = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.medium};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none;
  }
`;

const RoleBadge = styled.span`
  padding: 0.125rem ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const LogoutButton = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  padding: 0.375rem ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.danger};
    color: ${({ theme }) => theme.colors.danger};
  }
`;

const ROLE_LABELS: Record<UserRole, string> = {
  customer: "Müşteri",
  seller: "Satıcı",
};

export default function Header() {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate(paths.HOME);
  }

  return (
    <Bar>
      <Inner>
        <Brand to={paths.HOME}>LocalShop</Brand>

        <Nav>
          <NavLink to={paths.PRODUCTS}>Katalog</NavLink>
          <IconLink to={paths.PRODUCTS} aria-label="Ürün ara">
            🔍
          </IconLink>
        </Nav>

        {/* Satıcılar alışveriş yapmaz, bu yüzden sepet ikonu onlara gösterilmez. */}
        {user?.role !== "seller" && (
          <IconLink to={paths.CART} aria-label="Sepetim">
            🛒
            {/* Sepetteki ürün adedi CartContext (Faz 9.5) ile bağlanana kadar sabit 0. */}
            <CartBadge>0</CartBadge>
          </IconLink>
        )}

        {status === "authenticated" && user && (
          <AuthSection>
            {user.role === "seller" && <NavLink to={paths.SELLER_DASHBOARD}>Satıcı Paneli</NavLink>}
            <UserName>{user.name}</UserName>
            <RoleBadge>{ROLE_LABELS[user.role]}</RoleBadge>
            <LogoutButton type="button" onClick={handleLogout}>
              Çıkış Yap
            </LogoutButton>
          </AuthSection>
        )}

        {status === "unauthenticated" && (
          <AuthSection>
            <NavLink to={paths.LOGIN}>Giriş Yap</NavLink>
            <NavLink to={paths.REGISTER}>Kayıt Ol</NavLink>
          </AuthSection>
        )}
      </Inner>
    </Bar>
  );
}
