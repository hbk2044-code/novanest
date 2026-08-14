import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, formatPrice, formatDate, categoryGradient, categoryIcon } from '../api.js'

const STATUS_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const PAYMENT_LABEL = {
  pending: 'Pending',
  paid: 'Paid',
  refunded: 'Refunded',
  failed: 'Failed',
}

export default function OrdersPage() {
  const [params] = useSearchParams()
  const highlight = Number(params.get('highlight'))
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.get('/orders')
      .then((d) => {
        setOrders(d.orders)
        if (highlight) {
          const o = d.orders.find((x) => x.id === highlight)
          if (o) setSelected(o)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [highlight])

  const badgeClass = (status) => `badge badge-${status}`

  return (
    <div>
      <div className="section-title">
        <h2>My Orders</h2>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="big-icon">📦</div>
          <h3>No orders yet</h3>
          <p>When you place an order, it will show up here.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Items</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} style={o.id === highlight ? { background: '#faf5ff' } : {}}>
                  <td style={{ fontWeight: 700 }}>#{o.id}</td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{formatDate(o.createdAt)}</td>
                  <td>{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td style={{ fontSize: 13 }}>
                    {o.paymentMethod}{' '}
                    <span className={`badge badge-pay-${o.paymentStatus}`}>{PAYMENT_LABEL[o.paymentStatus] || o.paymentStatus}</span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{formatPrice(o.total)}</td>
                  <td>
                    <span className={badgeClass(o.status)}>{STATUS_LABEL[o.status]}</span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelected(o)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
              <div>
                <h2>Order #{selected.id}</h2>
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>{formatDate(selected.createdAt)}</p>
              </div>
              <span className={badgeClass(selected.status)}>{STATUS_LABEL[selected.status]}</span>
            </div>

            <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Delivery Details</div>
              {Object.keys(selected.deliveryDetails || {}).length > 0 ? (
                Object.entries(selected.deliveryDetails).map(([k, v]) => (
                  <div key={k} style={{ textTransform: 'capitalize' }}>
                    <strong>{k.replace(/([A-Z])/g, ' $1').trim()}:</strong> {v || '—'}
                  </div>
                ))
              ) : (
                <>
                  <div><strong>Ship to:</strong> {selected.shippingAddress}</div>
                  <div><strong>Phone:</strong> {selected.phone}</div>
                </>
              )}
              <div><strong>Payment:</strong> {selected.paymentMethod}</div>
            </div>

            {selected.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 10, fontSize: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: categoryGradient(item.categorySlug || ''),
                    overflow: 'hidden', flexShrink: 0,
                  }}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.productName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    categoryIcon(item.categorySlug || '')
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item.productName}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {formatPrice(item.price)} × {item.quantity}
                  </div>
                </div>
                <div style={{ fontWeight: 700 }}>{formatPrice(item.price * item.quantity)}</div>
              </div>
            ))}

            <div className="sum-row" style={{ marginTop: 12 }}>
              <span>Subtotal</span>
              <span>{formatPrice(selected.subtotal)}</span>
            </div>
            <div className="sum-row">
              <span>Delivery</span>
              <span>{selected.deliveryFee === 0 ? 'FREE' : formatPrice(selected.deliveryFee)}</span>
            </div>
            <div className="sum-row total">
              <span>Total</span>
              <span style={{ color: 'var(--primary)' }}>{formatPrice(selected.total)}</span>
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
