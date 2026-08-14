import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import { ToastProvider } from './components/Toast.jsx'
import Home from './pages/Home.jsx'
import Shop from './pages/Shop.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import CartPage from './pages/CartPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'
import AdminLayout from './admin/AdminLayout.jsx'
import Dashboard from './admin/Dashboard.jsx'
import AdminProducts from './admin/AdminProducts.jsx'
import AdminCategories from './admin/AdminCategories.jsx'
import AdminOrders from './admin/AdminOrders.jsx'
import AdminUsers from './admin/AdminUsers.jsx'
import AdminCheckoutSettings from './admin/AdminCheckoutSettings.jsx'
import AdminHeroBanners from './admin/AdminHeroBanners.jsx'
import AdminStoreSettings from './admin/AdminStoreSettings.jsx'
import AdminBranding from './admin/AdminBranding.jsx'
import AdminPurchases from './admin/AdminPurchases.jsx'
import AdminSupplierPayments from './admin/AdminSupplierPayments.jsx'
import AdminProfit from './admin/AdminProfit.jsx'
import InvoiceView from './admin/InvoiceView.jsx'
import AdminInventory from './admin/AdminInventory.jsx'
import RequireAuth from './components/RequireAuth.jsx'

export default function App() {
  return (
    <ToastProvider>
      <Header />
      <main className="page">
        <div className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route
              path="/cart"
              element={
                <RequireAuth>
                  <CartPage />
                </RequireAuth>
              }
            />
            <Route
              path="/checkout"
              element={
                <RequireAuth>
                  <CheckoutPage />
                </RequireAuth>
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/orders"
              element={
                <RequireAuth>
                  <OrdersPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAuth admin>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="inventory" element={<AdminInventory />} />
              <Route path="purchases" element={<AdminPurchases />} />
              <Route path="supplier-payments" element={<AdminSupplierPayments />} />
              <Route path="profit" element={<AdminProfit />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:id/invoice" element={<InvoiceView />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="checkout-settings" element={<AdminCheckoutSettings />} />
              <Route path="hero-banners" element={<AdminHeroBanners />} />
              <Route path="branding" element={<AdminBranding />} />
              <Route path="store-settings" element={<AdminStoreSettings />} />
            </Route>
          </Routes>
        </div>
      </main>
      <Footer />
    </ToastProvider>
  )
}
