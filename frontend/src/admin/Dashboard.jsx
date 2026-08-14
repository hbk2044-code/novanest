import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatPrice, formatDate } from '../api.js'

const STATUS_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/admin/stats').then(setStats).catch(() => {})
  }, [])

  if (!stats) {
    return <div className="loading"><div className="spinner" /> Loading dashboard...</div>
  }

  const cards = [
    { label: 'Total Revenue', value: formatPrice(stats.totalRevenue), icon: '💰' },
    { label: 'Gross Profit', value: formatPrice(stats.grossProfit), icon: '📈', accent: 'var(--success)' },
    { label: 'Profit Margin', value: `${stats.profitMargin}%`, icon: '🧮', accent: 'var(--success)' },
    { label: 'Total Orders', value: stats.totalOrders, icon: '🧾' },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: '⏳' },
    { label: 'Customers', value: stats.totalCustomers, icon: '👥' },
    { label: 'Products', value: stats.totalProducts, icon: '📦' },
    { label: 'Low Stock (<10)', value: stats.lowStock, icon: '⚠️' },
  ]

  const maxRevenue = Math.max(1, ...stats.last7.map((d) => d.revenue))
  const maxProfit = Math.max(1, ...stats.last7.map((d) => Math.max(d.profit, 0)))
  const maxCatRevenue = Math.max(1, ...stats.revenueByCategory.map((c) => c.revenue))

  return (
    <div>
      <div className="section-title">
        <h2>Dashboard</h2>
        <Link to="/shop" className="btn btn-outline btn-sm">View Storefront →</Link>
      </div>

      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <span className="stat-icon">{c.icon}</span>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value" style={{ fontSize: c.value.length > 12 ? 20 : 26, color: c.accent || 'inherit' }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="admin-grid">
        <div className="table-wrap">
          <h3>Revenue vs Profit — Last 7 Days</h3>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180 }}>
              {stats.last7.map((d) => (
                <div key={d.label} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 6 }}>{formatPrice(d.profit)}</div>
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(4, (d.revenue / maxRevenue) * 120)}px`,
                      background: 'linear-gradient(180deg, var(--primary), #a855f7)',
                      borderRadius: '8px 8px 0 0',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${Math.max(0, (d.profit / maxProfit) * 100)}%`,
                        background: 'linear-gradient(180deg, var(--success), #22c55e)',
                        borderRadius: '0 0 8px 0',
                        opacity: 0.85,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{d.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.orders} orders</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
              <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'linear-gradient(180deg, var(--primary), #a855f7)', borderRadius: 3, verticalAlign: 'middle' }} /> Revenue</span>
              <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'var(--success)', borderRadius: 3, verticalAlign: 'middle' }} /> Profit</span>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <h3>Revenue by Category</h3>
          <div style={{ padding: 20 }}>
            {stats.revenueByCategory.map((c) => (
              <div key={c.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <span style={{ color: 'var(--muted)' }}>{formatPrice(c.revenue)}</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg)', borderRadius: 6, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(c.revenue / maxCatRevenue) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--accent), var(--danger))',
                      borderRadius: 6,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-grid">
        <div className="table-wrap">
          <h3>Recent Orders</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.length === 0 && (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--muted)' }}>No orders yet</td></tr>
              )}
              {stats.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 700 }}>#{o.id}</td>
                  <td>{o.customer}</td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{formatDate(o.createdAt)}</td>
                  <td style={{ fontWeight: 700 }}>{formatPrice(o.total)}</td>
                  <td><span className={`badge badge-${o.status}`}>{STATUS_LABEL[o.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-wrap">
          <h3>Top Selling Products</h3>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Sold</th>
                <th>Revenue</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {stats.topProducts.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.sold}</td>
                  <td style={{ fontWeight: 700 }}>{formatPrice(p.revenue)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatPrice(p.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
