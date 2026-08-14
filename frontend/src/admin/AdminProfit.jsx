import { useEffect, useState } from 'react'
import { api, formatPrice } from '../api.js'
import { useToast } from '../components/Toast.jsx'

export default function AdminProfit() {
  const [stats, setStats] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    Promise.all([api.get('/admin/stats'), api.get('/admin/products')])
      .then(([s, p]) => {
        setStats(s)
        setProducts(p.products)
      })
      .catch((err) => toast.error(err.message || 'Could not load profit data'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading...</div>
  }

  const withProfit = products
    .map((p) => ({
      ...p,
      profitPerUnit: p.price - (p.costPrice || 0),
      totalProfit: p.sold * (p.price - (p.costPrice || 0)),
      marginPct: p.price > 0 ? Math.round(((p.price - (p.costPrice || 0)) / p.price) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.totalProfit - a.totalProfit)

  const cards = [
    { label: 'Total Revenue', value: formatPrice(stats.totalRevenue), icon: '💰' },
    { label: 'Cost of Goods Sold', value: formatPrice(stats.totalCost), icon: '📦' },
    { label: 'Gross Profit', value: formatPrice(stats.grossProfit), icon: '📈', accent: 'var(--success)' },
    { label: 'Profit Margin', value: `${stats.profitMargin}%`, icon: '🧮', accent: 'var(--success)' },
  ]

  const maxProfit = Math.max(1, ...stats.revenueByCategory.map((c) => Math.max(c.profit, 0)))
  const maxTopProfit = Math.max(1, ...withProfit.slice(0, 8).map((p) => Math.max(p.totalProfit, 0)))

  return (
    <div>
      <div className="section-title">
        <h2>Profit Calculation</h2>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20, maxWidth: 760 }}>
        Profit is calculated from the <strong>cost price</strong> of each product (set on the
        product or auto-updated from stock intake) versus its selling price:
        <em> profit per unit = selling price − cost price</em>. Existing orders use the cost price
        snapshot taken at checkout.
      </p>

      <div className="stat-grid">
        {cards.map((c) => (
          <div className="stat-card" key={c.label}>
            <span className="stat-icon">{c.icon}</span>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value" style={{ color: c.accent || 'inherit' }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="admin-grid">
        <div className="table-wrap">
          <h3>Profit by Category</h3>
          <div style={{ padding: 20 }}>
            {stats.revenueByCategory.map((c) => (
              <div key={c.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <span style={{ color: 'var(--muted)' }}>
                    Revenue {formatPrice(c.revenue)} · Cost {formatPrice(c.cost)}
                  </span>
                </div>
                <div style={{ height: 8, background: 'var(--bg)', borderRadius: 6, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.max(0, (c.profit / maxProfit) * 100)}%`,
                      height: '100%',
                      background: c.profit >= 0 ? 'linear-gradient(90deg, var(--success), #22c55e)' : 'var(--danger)',
                      borderRadius: 6,
                    }}
                  />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: c.profit >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: 2 }}>
                  Profit {formatPrice(c.profit)} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>({c.sales} sold)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <h3>Top Profit Products</h3>
          <div style={{ padding: 20 }}>
            {withProfit.slice(0, 8).map((p) => (
              <div key={p.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatPrice(p.totalProfit)}</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg)', borderRadius: 6, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(p.totalProfit / maxTopProfit) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--accent), var(--primary))',
                      borderRadius: 6,
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {p.sold} sold · {formatPrice(p.price)} - {formatPrice(p.costPrice || 0)} = {formatPrice(p.profitPerUnit)}/unit · {p.marginPct}% margin
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <h3>All Products — Profit Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Selling Price</th>
              <th>Cost Price</th>
              <th>Profit / Unit</th>
              <th>Margin</th>
              <th>Sold</th>
              <th>Total Profit</th>
            </tr>
          </thead>
          <tbody>
            {withProfit.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>{formatPrice(p.price)}</td>
                <td style={{ color: 'var(--muted)' }}>{formatPrice(p.costPrice || 0)}</td>
                <td style={{ fontWeight: 700, color: p.profitPerUnit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {formatPrice(p.profitPerUnit)}
                </td>
                <td style={{ fontSize: 13 }}>{p.marginPct}%</td>
                <td>{p.sold}</td>
                <td style={{ fontWeight: 800, color: p.totalProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {formatPrice(p.totalProfit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
