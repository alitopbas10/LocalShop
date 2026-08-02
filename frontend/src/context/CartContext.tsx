import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";
import * as cartService from "@/services/cartService";
import type { CartView } from "@/types/models";

interface CartContextValue {
  cart: CartView | null;
  isLoading: boolean;
  error: unknown;
  itemCount: number;
  refreshCart: () => Promise<void>;
  addItem: (productId: string, quantity: number) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

export const CartContext = createContext<CartContextValue | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const { user, status } = useAuth();
  const [cart, setCart] = useState<CartView | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Sepet yalnızca giriş yapmış CUSTOMER için anlamlıdır: /api/cart route'u
  // authenticate + authorize("customer") ile korunur. Seller veya misafir için bu
  // isteği atmak her sayfa geçişinde kaçınılmaz bir 403 üretir — hem gereksiz ağ
  // trafiği hem de konsolda/log'da gürültü demektir.
  const shouldLoadCart = status === "authenticated" && user?.role === "customer";

  const refreshCart = useCallback(async () => {
    if (!shouldLoadCart) {
      setCart(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await cartService.getCart();
      setCart(result);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [shouldLoadCart]);

  useEffect(() => {
    if (shouldLoadCart) {
      refreshCart();
    } else {
      setCart(null);
      setError(null);
    }
  }, [shouldLoadCart, refreshCart]);

  // Her mutasyon backend'in güncel CartView'ını döner; sepeti "tazelemek" burada ayrı
  // bir GET isteği anlamına gelmez, dönen sonucu state'e yazmak yeterlidir. Hata
  // durumunda state'e dokunulmaz, hata olduğu gibi fırlatılır ki çağıran taraf
  // (ör. useMutation) kendi try/catch'ini yapabilsin.
  const addItem = useCallback(async (productId: string, quantity: number) => {
    const result = await cartService.addItem(productId, quantity);
    setCart(result);
  }, []);

  const updateItem = useCallback(async (productId: string, quantity: number) => {
    const result = await cartService.updateItem(productId, quantity);
    setCart(result);
  }, []);

  const removeItem = useCallback(async (productId: string) => {
    const result = await cartService.removeItem(productId);
    setCart(result);
  }, []);

  const clearCart = useCallback(async () => {
    const result = await cartService.clearCart();
    setCart(result);
  }, []);

  const itemCount = cart?.itemCount ?? 0;

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      isLoading,
      error,
      itemCount,
      refreshCart,
      addItem,
      updateItem,
      removeItem,
      clearCart,
    }),
    [cart, isLoading, error, itemCount, refreshCart, addItem, updateItem, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
