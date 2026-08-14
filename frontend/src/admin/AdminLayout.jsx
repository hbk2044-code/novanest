import { NavLink, Outlet } from 'react-router-dom'

const LINKS = [
  { to: '/admin', end: true, icon: '📊', label: 'Dashboard' },
  { to: '/admin/hero-banners', icon: '🖼️', label: 'Hero Banners' },
  { to: '/admin/products', icon: '📦', label: 'Products' },
  { to: '/admin/inventory', icon: '🏬', label: 'Inventory' },
  { to: '/admin/purchases', icon: '📥', label: 'Stock Intake' },
  { to: '/admin/supplier-payments', icon: '💳', label: 'Supplier Payments' },
  { to: '/admin/profit', icon: '📈', label: 'Profit' },
  { to: '/admin/categories', icon: '🗂️', label: 'Categories' },
  { to: '/admin/orders', icon: '🧾', label: 'Orders' },
  { to: '/admin/users', icon: '👥', label: 'Users' },
  { to: '/admin/checkout-settings', icon: '🚚', label: 'Delivery Form' },
  { to: '/admin/branding', icon: '🏷️', label: 'Logo & Name' },
  { to: '/admin/store-settings', icon: '🏪', label: 'Store / Invoice' },
]

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
          Admin Panel
        </div>
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}>
            <span>{l.icon}</span> {l.label}
          </NavLink>
        ))}
      </aside>
      <div>
        <Outlet />
      </div>
    </div>
  )
}
