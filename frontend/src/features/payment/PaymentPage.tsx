import { useEffect } from "react";

import { useCart } from "@/hooks/useCart";

export default function PaymentPage() {
  const { refreshCart } = useCart();

  // Kullanıcı bu sayfaya doğrudan bir URL ile gelebilir (yer imi, sayfa yenileme);
  // sipariş oluşturma sepeti sunucuda zaten boşaltmıştır (bkz. CartContext.
  // createOrderFromCart), CartContext'in bunu bu senaryoda da görmesi için burada
  // ayrıca bir tazeleme tetiklenir.
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  return <h1>Ödeme</h1>;
}
