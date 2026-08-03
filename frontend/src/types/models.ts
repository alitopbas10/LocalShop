// Backend response gövdelerine birebir uyan tipler. Tarih alanları (createdAt, updatedAt,
// paidAt, cancelledAt) backend tarafında Date olsa da, response JSON.stringify'dan geçtiği
// için telde ISO string olarak gelir; axios bunları otomatik Date'e çevirmez — bu yüzden
// burada string olarak modellenirler.

// ---- AUTH ----
// Kaynak: backend/src/modules/auth/user.types.ts, user.model.ts, auth.service.ts

export type UserRole = "customer" | "seller";

// GET /api/auth/me, ve POST /api/auth/register, POST /api/auth/login (AuthResult.user)
export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// POST /api/auth/register, POST /api/auth/login
export interface AuthResult {
  user: User;
  token: string;
}

// ---- PRODUCT / CATALOG ----
// Kaynak: backend/src/modules/product/product.types.ts, product.model.ts, product.mapper.ts

export type ProductCategory =
  | "food"
  | "beverage"
  | "handcraft"
  | "textile"
  | "cosmetics"
  | "home"
  | "other";

interface CatalogSellerRef {
  _id: string;
  name: string | null;
}

// GET /api/products (herkese açık katalog; satıcı ürün yönetimi /api/seller/products'ta)
export interface CatalogListItem {
  _id: string;
  name: string;
  price: number;
  stock: number;
  category: ProductCategory;
  imageUrl?: string;
  inStock: boolean;
  seller: CatalogSellerRef;
  createdAt: string;
}

// GET /api/products/:id
export interface CatalogDetail {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: ProductCategory;
  imageUrl?: string;
  inStock: boolean;
  seller: CatalogSellerRef;
  createdAt: string;
  updatedAt: string;
}

// GET /api/products/categories
export interface CatalogCategoryCount {
  value: ProductCategory;
  count: number;
}

// Seller ürün yönetimi endpoint'leri: POST/GET /api/seller/products,
// GET/PATCH /api/seller/products/:id, DELETE /api/seller/products/:id,
// PATCH /api/seller/products/:id/activate.
// Bu ürünler .toJSON() ile serileşmiş ham Product belgesidir (mapper'dan geçmez), bu yüzden
// sellerId burada populate edilmemiş, düz bir ObjectId string'idir.
export interface SellerProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: ProductCategory;
  sellerId: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- CART ----
// Kaynak: backend/src/modules/cart/cart.service.ts

export type CartItemIssue = "PRODUCT_UNAVAILABLE" | "INSUFFICIENT_STOCK";

interface CartLineProduct {
  _id: string;
  name: string;
  price: number;
  imageUrl?: string;
  category: ProductCategory;
  stock: number;
}

// GET /api/cart, POST /api/cart/items, PATCH /api/cart/items/:productId,
// DELETE /api/cart/items/:productId, DELETE /api/cart (CartView.items)
export interface CartItemView {
  productId: string;
  quantity: number;
  product: CartLineProduct | null;
  unitPrice: number;
  lineTotal: number;
  available: boolean;
  issue: CartItemIssue | null;
  availableStock: number;
}

export interface CartIssue {
  productId: string;
  productName: string;
  issue: CartItemIssue;
  requested: number;
  available: number;
}

// GET /api/cart, POST /api/cart/items, PATCH /api/cart/items/:productId,
// DELETE /api/cart/items/:productId, DELETE /api/cart
export interface CartView {
  items: CartItemView[];
  itemCount: number;
  distinctItemCount: number;
  subtotal: number;
  hasIssues: boolean;
  issues: CartIssue[];
}

// ---- ORDER ----
// Kaynak: backend/src/modules/order/order.types.ts, order.service.ts

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PAYMENT_FAILED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export type FulfillmentStatus = "PENDING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

// Müşteri sipariş görünümü: POST /api/orders, GET /api/orders (liste elemanı),
// GET /api/orders/:id, PATCH /api/orders/:id/cancel
export interface OrderItem {
  productId: string;
  sellerId: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
  fulfillmentStatus: FulfillmentStatus;
}

export interface Order {
  _id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  totalPrice: number;
  status: OrderStatus;
  sellerIds: string[];
  paidAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Satıcı sipariş görünümü: GET /api/seller/orders (liste elemanı), GET /api/seller/orders/:id,
// PATCH /api/seller/orders/:id/fulfillment. Diğer satıcıların satırları filtrelenmiştir;
// alıcının yalnızca adı vardır (e-posta yok).
export interface SellerOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
  fulfillmentStatus: FulfillmentStatus;
}

export interface SellerOrder {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  buyer: { name: string | null };
  items: SellerOrderItem[];
  sellerSubtotal: number;
  itemCount: number;
  // Diğer satıcıların satırları hiç sızdırılmaz; bu yalnızca "var mı yok mu" bilgisidir,
  // sellerSubtotal'ın sipariş toplamından neden farklı olabileceğini açıklamak içindir.
  hasOtherSellers: boolean;
}

// ---- PAYMENT ----
// Kaynak: backend/src/modules/payment/payment.types.ts, payment.service.ts

export type PaymentStatus = "SUCCEEDED" | "FAILED";

export type PaymentFailureReason =
  | "CARD_DECLINED"
  | "INVALID_CARD_NUMBER"
  | "CARD_EXPIRED"
  | "INSUFFICIENT_FUNDS"
  | "PROCESSING_ERROR";

// GET /api/payments/order/:orderId (liste elemanı), POST /api/payments/pay (PayOrderResult.payment)
// Kart numarası/CVV/son kullanma tarihi bu tipte hiç yer almaz: backend'de zaten saklanmıyor.
export interface Payment {
  _id: string;
  orderId: string;
  userId: string;
  amount: number;
  status: PaymentStatus;
  cardLast4: string;
  cardBrand: string;
  failureReason?: PaymentFailureReason;
  transactionId: string;
  createdAt: string;
  updatedAt: string;
}

// POST /api/payments/pay
export interface PayOrderResult {
  payment: Payment;
  order: {
    _id: string;
    orderNumber: string;
    status: OrderStatus;
    totalPrice: number;
  };
}
