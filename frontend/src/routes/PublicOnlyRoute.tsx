import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import FullPageLoader from "@/components/FullPageLoader";
import { useAuth } from "@/hooks/useAuth";
import { paths } from "@/routes/paths";

interface PublicOnlyRouteProps {
  children: ReactNode;
}

// Giriş yapmış bir kullanıcı /login veya /register'a giderse ana sayfaya yönlendirilir:
// bu sayfaların ona artık bir faydası yok.
export default function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { status } = useAuth();

  // ProtectedRoute'taki aynı gerekçe burada da geçerli: /auth/me cevabı gelmeden
  // "unauthenticated" varsayıp login formunu göstermek, oturumu olan bir kullanıcıya
  // formu bir an için yanlışlıkla gösterebilir.
  if (status === "loading") {
    return <FullPageLoader />;
  }

  if (status === "authenticated") {
    return <Navigate to={paths.HOME} replace />;
  }

  return <>{children}</>;
}
