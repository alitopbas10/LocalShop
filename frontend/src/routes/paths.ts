// Tüm route yolları tek yerde toplanır: bileşenler arasına dağılmış string literal'lar
// bir yol değiştiğinde tek tek aranıp değiştirilmek zorunda kalınmasına yol açar.
export const paths = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  PRODUCTS: "/products",
  PRODUCT_DETAIL: "/products/:id",
  CART: "/cart",
  ORDERS: "/orders",
  ORDER_DETAIL: "/orders/:id",
  PAYMENT: "/payment/:orderId",
  SELLER_DASHBOARD: "/seller",
  SELLER_PRODUCTS: "/seller/products",
  SELLER_PRODUCT_NEW: "/seller/products/new",
  SELLER_PRODUCT_EDIT: "/seller/products/:id/edit",
  SELLER_ORDERS: "/seller/orders",
  SELLER_ORDER_DETAIL: "/seller/orders/:id",
  NOT_FOUND: "*",
} as const;

export function productDetail(id: string): string {
  return `/products/${id}`;
}

export function orderDetail(id: string): string {
  return `/orders/${id}`;
}

export function payment(orderId: string): string {
  return `/payment/${orderId}`;
}

export function sellerProductEdit(id: string): string {
  return `/seller/products/${id}/edit`;
}

export function sellerOrderDetail(id: string): string {
  return `/seller/orders/${id}`;
}
