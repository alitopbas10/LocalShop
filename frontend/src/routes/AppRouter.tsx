import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";

import AppLayout from "@/components/layout/AppLayout";
import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";
import ProductDetailPage from "@/features/catalog/ProductDetailPage";
import ProductListPage from "@/features/catalog/ProductListPage";
import CartPage from "@/features/cart/CartPage";
import NotFoundPage from "@/features/misc/NotFoundPage";
import OrderDetailPage from "@/features/orders/OrderDetailPage";
import OrderListPage from "@/features/orders/OrderListPage";
import PaymentPage from "@/features/payment/PaymentPage";
import SellerDashboardPage from "@/features/seller/SellerDashboardPage";
import SellerLayout from "@/features/seller/SellerLayout";
import SellerOrderDetailPage from "@/features/seller/SellerOrderDetailPage";
import SellerOrdersPage from "@/features/seller/SellerOrdersPage";
import SellerProductEditPage from "@/features/seller/SellerProductEditPage";
import SellerProductListPage from "@/features/seller/SellerProductListPage";
import SellerProductNewPage from "@/features/seller/SellerProductNewPage";
import ProtectedRoute from "@/routes/ProtectedRoute";
import { paths } from "@/routes/paths";
import PublicOnlyRoute from "@/routes/PublicOnlyRoute";

// react-router nested route'larda path'i üst route'a göre RELATIF bekler; paths.ts'teki
// sabitler (Link/Navigate için) baştan "/" ile başladığından burada tek yerde kırpılır —
// böylece yol sabitleri yine tek kaynaktan (paths.ts) gelir, ikinci bir kopyası açılmaz.
function relative(path: string): string {
  return path.replace(/^\//, "");
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <ProductListPage /> },
      { path: relative(paths.PRODUCTS), element: <ProductListPage /> },
      { path: relative(paths.PRODUCT_DETAIL), element: <ProductDetailPage /> },
      {
        path: relative(paths.LOGIN),
        element: (
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        ),
      },
      {
        path: relative(paths.REGISTER),
        element: (
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        ),
      },
      {
        element: (
          <ProtectedRoute allowedRoles={["customer"]}>
            <Outlet />
          </ProtectedRoute>
        ),
        children: [
          { path: relative(paths.CART), element: <CartPage /> },
          { path: relative(paths.ORDERS), element: <OrderListPage /> },
          { path: relative(paths.ORDER_DETAIL), element: <OrderDetailPage /> },
          { path: relative(paths.PAYMENT), element: <PaymentPage /> },
        ],
      },
      {
        element: (
          <ProtectedRoute allowedRoles={["seller"]}>
            <SellerLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: relative(paths.SELLER_DASHBOARD), element: <SellerDashboardPage /> },
          { path: relative(paths.SELLER_PRODUCTS), element: <SellerProductListPage /> },
          { path: relative(paths.SELLER_PRODUCT_NEW), element: <SellerProductNewPage /> },
          { path: relative(paths.SELLER_PRODUCT_EDIT), element: <SellerProductEditPage /> },
          { path: relative(paths.SELLER_ORDERS), element: <SellerOrdersPage /> },
          { path: relative(paths.SELLER_ORDER_DETAIL), element: <SellerOrderDetailPage /> },
        ],
      },
      { path: paths.NOT_FOUND, element: <NotFoundPage /> },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
