import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import * as authService from "@/services/authService";
import type { RegisterInput } from "@/services/authService";
import { setUnauthorizedHandler } from "@/services/apiClient";
import { clearToken, getToken, setToken } from "@/services/tokenStorage";
import type { User } from "@/types/models";

// isLoading + isAuthenticated gibi iki ayrı boolean tutmak yerine tek bir durum alanı
// kullanılıyor: iki boolean dört kombinasyon üretir ve bunlardan biri (loading=true,
// authenticated=true) hiç var olmaması gereken imkansız bir durumdur. Tek union tipi bu
// imkansız durumu tip seviyesinde baştan engeller.
type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  // apiClient router'a doğrudan bağımlı olmamalı (döngüsel bağımlılık ve test edilebilirlik
  // sorunu); bunun yerine 401 alındığında tetiklenecek callback burada bağlanır.
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // Bu efekt tamamlanana kadar status "loading" olarak kalmalı: korumalı route'lar
  // "loading" durumunu "unauthenticated" ile karıştırıp geçerli bir token'ı olan
  // kullanıcıyı /auth/me yanıtı gelmeden önce yanlışlıkla login'e yönlendirmemeli.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    authService
      .getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        setStatus("authenticated");
      })
      .catch(() => {
        clearToken();
        setStatus("unauthenticated");
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login({ email, password });
    setToken(result.token);
    setUser(result.user);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await authService.register(input);
    setToken(result.token);
    setUser(result.user);
    setStatus("authenticated");
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout, refreshUser }),
    [user, status, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function isCustomer(user: User | null): boolean {
  return user?.role === "customer";
}

export function isSeller(user: User | null): boolean {
  return user?.role === "seller";
}
