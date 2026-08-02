import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import styled from "styled-components";

import FullPageLoader from "@/components/FullPageLoader";
import { useAuth } from "@/hooks/useAuth";
import { paths } from "@/routes/paths";
import type { UserRole } from "@/types/models";

const ForbiddenWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  min-height: 60vh;
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};

  h1 {
    font-size: ${({ theme }) => theme.fontSizes.xl};
    color: ${({ theme }) => theme.colors.danger};
  }

  p {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

function ForbiddenScreen() {
  return (
    <ForbiddenWrapper>
      <h1>403 - Yetkiniz Yok</h1>
      <p>Bu sayfaya erişim yetkiniz bulunmuyor.</p>
    </ForbiddenWrapper>
  );
}

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, status } = useAuth();
  const location = useLocation();

  // status "loading" iken bir karar verilemez: sayfa yenilendiğinde /auth/me cevabı henüz
  // gelmemişken burayı "unauthenticated" sayıp kullanıcıyı login'e fırlatmak, aslında
  // geçerli bir oturumu olan kullanıcıyı gereksiz yere çıkışa zorlar.
  if (status === "loading") {
    return <FullPageLoader />;
  }

  if (status === "unauthenticated") {
    // Giriş sonrası kullanıcıyı geldiği yere geri döndürebilmek için hedef yol state
    // içinde taşınır; replace kullanılır ki geri tuşu tekrar login'e takılmasın.
    return <Navigate to={paths.LOGIN} state={{ from: location }} replace />;
  }

  // Kullanıcı giriş yapmış ama rolü izin verilenler arasında değilse bu bir 403'tür,
  // 401 değil: sorun kimlik doğrulama değil yetki, bu yüzden login'e geri gönderilmez.
  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    return <ForbiddenScreen />;
  }

  return <>{children}</>;
}
