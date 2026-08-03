import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";

import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { paths } from "@/routes/paths";
import type { UserRole } from "@/types/models";

// Dokunma hedefleri (ikon linkleri, hamburger, çıkış butonu) en az 44x44px olacak
// şekilde boyutlandırılır — parmakla dokunulacak bir öğe için yaygın kabul gören alt
// sınır budur, 2rem (32px) gibi daha küçük kutular mobilde yanlış tıklamalara yol açar.
const TOUCH_TARGET = "2.75rem";

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Inner = styled.div`
  max-width: ${({ theme }) => theme.layout.maxWidth};
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

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  flex: 1;
`;

// Katalog metin linki masaüstünde görünür; mobilde yanındaki arama ikonu zaten aynı
// yere gittiği için metin linki hamburger menüsüne taşınır (bkz. MobilePanel) —
// ikisini birden dar ekranda göstermek gereksiz tekrar olurdu.
const NavLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  min-height: ${TOUCH_TARGET};
  padding: 0 ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.text};
  font-weight: ${({ theme }) => theme.fontWeights.medium};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none;
  }
`;

const IconLink = styled(Link)`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${TOUCH_TARGET};
  height: ${TOUCH_TARGET};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  border-radius: ${({ theme }) => theme.radii.full};

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const CartBadge = styled.span`
  position: absolute;
  top: 0;
  right: 0;
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

// Kimlik/oturum ile ilgili her şey (kullanıcı adı, rol, Katalog/Satıcı Paneli/Giriş/
// Kayıt linkleri, çıkış) mobilde ana çubuktan kaldırılıp hamburger panelinde toplanır;
// ana çubukta yalnızca marka + arama + sepet + menü düğmesi kalır ("sadeleşme").
const AuthSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none;
  }
`;

const UserName = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: ${TOUCH_TARGET};
  padding: 0 ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.danger};
    color: ${({ theme }) => theme.colors.danger};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const MenuToggle = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: ${TOUCH_TARGET};
  height: ${TOUCH_TARGET};
  border: none;
  background: transparent;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: inline-flex;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const MobilePanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none;
  }
`;

const MobileNavLink = styled(Link)`
  display: flex;
  align-items: center;
  min-height: ${TOUCH_TARGET};
  padding: 0 ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text};
  font-weight: ${({ theme }) => theme.fontWeights.medium};

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const MobileUserRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
`;

const MobileLogoutButton = styled(LogoutButton)`
  width: 100%;
`;

const ROLE_LABELS: Record<UserRole, string> = {
  customer: "Müşteri",
  seller: "Satıcı",
};

export default function Header() {
  const { user, status, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [isMenuOpen, setMenuOpen] = useState(false);

  // Menü açıkken Escape ile kapanır — Modal'daki aynı desen, klavye kullanıcıları için
  // tutarlı bir kapatma yolu sağlar.
  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleLogout() {
    closeMenu();
    logout();
    navigate(paths.HOME);
  }

  return (
    <Bar>
      <Inner>
        <Brand to={paths.HOME} onClick={closeMenu}>
          LocalShop
        </Brand>

        <Nav>
          <NavLink to={paths.PRODUCTS}>Katalog</NavLink>
          <IconLink to={paths.PRODUCTS} aria-label="Ürün ara">
            🔍
          </IconLink>
        </Nav>

        {/* Satıcılar alışveriş yapmaz, bu yüzden sepet ikonu onlara gösterilmez. */}
        {user?.role !== "seller" && (
          <IconLink to={paths.CART} aria-label={`Sepetim, ${itemCount} ürün`}>
            🛒
            {itemCount > 0 && <CartBadge aria-hidden="true">{itemCount}</CartBadge>}
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

        <MenuToggle
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-nav-panel"
          aria-label={isMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">{isMenuOpen ? "✕" : "☰"}</span>
        </MenuToggle>
      </Inner>

      {isMenuOpen && (
        <MobilePanel id="mobile-nav-panel">
          <MobileNavLink to={paths.PRODUCTS} onClick={closeMenu}>
            Katalog
          </MobileNavLink>

          {status === "authenticated" && user && (
            <>
              {user.role === "seller" && (
                <MobileNavLink to={paths.SELLER_DASHBOARD} onClick={closeMenu}>
                  Satıcı Paneli
                </MobileNavLink>
              )}
              <MobileUserRow>
                <UserName>{user.name}</UserName>
                <RoleBadge>{ROLE_LABELS[user.role]}</RoleBadge>
              </MobileUserRow>
              <MobileLogoutButton type="button" onClick={handleLogout}>
                Çıkış Yap
              </MobileLogoutButton>
            </>
          )}

          {status === "unauthenticated" && (
            <>
              <MobileNavLink to={paths.LOGIN} onClick={closeMenu}>
                Giriş Yap
              </MobileNavLink>
              <MobileNavLink to={paths.REGISTER} onClick={closeMenu}>
                Kayıt Ol
              </MobileNavLink>
            </>
          )}
        </MobilePanel>
      )}
    </Bar>
  );
}
