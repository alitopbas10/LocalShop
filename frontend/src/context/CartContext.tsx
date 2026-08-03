import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";
import * as cartService from "@/services/cartService";
import * as orderService from "@/services/orderService";
import type { CartView, Order } from "@/types/models";

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
  createOrderFromCart: () => Promise<Order>;
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

  // Sipariş oluşturma sepeti SUNUCUDA da temizler (order.service.ts, aynı transaction
  // içinde). Sayfanın orderService'i doğrudan çağırması bu gerçeği CartContext'ten
  // saklardı: header'daki adet rozeti ve sepet sayfası hep CartContext'ten okur, o da
  // habersiz kalınca eski (dolu) sepeti göstermeye devam ederdi. Sepeti YÖNETEN bağlam,
  // sepeti DEĞİŞTİREN her işlemden geçmelidir — iki kaynağın senkron kalmasının tek yolu bu.
  const createOrderFromCart = useCallback(async (): Promise<Order> => {
    try {
      const order = await orderService.createOrder();
      // Önce iyimser olarak yerel state hemen boşaltılır (kullanıcı header'da/sepet
      // sayfasında beklemeden doğru sonucu görsün), ardından refreshCart ile sunucudan
      // doğrulanır — sunucu zaten boş dönecektir, bu sadece kaynağı tek noktada tutar.
      setCart((current) =>
        current
          ? { ...current, items: [], itemCount: 0, distinctItemCount: 0, subtotal: 0, hasIssues: false, issues: [] }
          : current,
      );
      await refreshCart();
      return order;
    } catch (err) {
      // INSUFFICIENT_STOCK gibi bir hata, sepeti kontrol ettiğimiz an ile sipariş
      // oluşturma anı arasında bir şeyin değiştiğini gösterir; kullanıcı eski değil
      // güncel sepeti görmeli.
      await refreshCart();
      throw err;
    }
  }, [refreshCart]);

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
      createOrderFromCart,
    }),
    [cart, isLoading, error, itemCount, refreshCart, addItem, updateItem, removeItem, clearCart, createOrderFromCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
