import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatPrice, formatDate } from '../api.js'
import { useToast } from '../components/Toast.jsx'

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

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const load = (q) => {
    setLoading(true)
    const params = q ? `?search=${encodeURIComponent(q)}` : ''
    api.get(`/admin/orders${params}`).then((d) => setOrders(d.orders)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => {
    const t = setTimeout(() => load(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const updateStatus = async (order, status) => {
    try {
      await api.put(`/admin/orders/${order.id}`, { status })
      toast.success(`Order #${order.id} → ${STATUS_LABEL[status]}`)
      setSelected((s) => (s && s.id === order.id ? { ...s, status } : s))
      load(search)
    } catch (err) {
      toast.error(err.message || 'Update failed')
    }
  }

  const updatePayment = async (order, paymentStatus) => {
    try {
      await api.put(`/admin/orders/${order.id}`, { paymentStatus })
      toast.success(`Order #${order.id} payment → ${PAYMENT_LABEL[paymentStatus]}`)
      setSelected((s) => (s && s.id === order.id ? { ...s, paymentStatus } : s))
      load(search)
    } catch (err) {
      toast.error(err.message || 'Update failed')
    }
  }

  return (
    <div>
      <div className="section-title">
        <h2>Orders ({orders.length})</h2>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search by order #, customer, email, phone, product or payment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Payment St.</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="9" style={{ textAlign: 'center', color: 'var(--muted)' }}>Loading...</td></tr>
            )}
            {!loading && orders.length === 0 && (
              <tr><td colSpan="9" style={{ textAlign: 'center', color: 'var(--muted)' }}>No orders found</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id}>
                <td style={{ fontWeight: 700 }}>#{o.id}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{o.customer}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{o.email}</div>
                </td>
                <td style={{ fontSize: 13, color: 'var(--muted)' }}>{formatDate(o.createdAt)}</td>
                <td>{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                <td style={{ fontWeight: 700 }}>{formatPrice(o.total)}</td>
                <td style={{ fontSize: 13 }}>{o.paymentMethod}</td>
                <td>
                  <span className={`badge badge-pay-${o.paymentStatus}`}>{PAYMENT_LABEL[o.paymentStatus] || o.paymentStatus}</span>
                </td>
                <td><span className={`badge badge-${o.status}`}>{STATUS_LABEL[o.status]}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelected(o)}>Manage</button>
                    <Link to={`/admin/orders/${o.id}/invoice`} className="btn btn-outline btn-sm">Invoice</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
              <div>
                <h2 style={{ marginBottom: 0 }}>Order #{selected.id}</h2>
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>{formatDate(selected.createdAt)}</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span className={`badge badge-${selected.status}`}>{STATUS_LABEL[selected.status]}</span>
                <span className={`badge badge-pay-${selected.paymentStatus}`}>{PAYMENT_LABEL[selected.paymentStatus] || selected.paymentStatus}</span>
              </div>
            </div>

            <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 14 }}>
              <div><strong>Customer:</strong> {selected.customer} ({selected.email})</div>
              <div style={{ fontWeight: 700, marginTop: 8, marginBottom: 4 }}>Delivery Details</div>
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
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                <span>{item.productName} <span style={{ color: 'var(--muted)' }}>× {item.quantity}</span></span>
                <span style={{ fontWeight: 700 }}>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}

            <div className="sum-row" style={{ marginTop: 10 }}>
              <span>Subtotal</span><span>{formatPrice(selected.subtotal)}</span>
            </div>
            <div className="sum-row">
              <span>Delivery</span><span>{selected.deliveryFee === 0 ? 'FREE' : formatPrice(selected.deliveryFee)}</span>
            </div>
            <div className="sum-row total">
              <span>Total</span><span style={{ color: 'var(--primary)' }}>{formatPrice(selected.total)}</span>
            </div>

            <div style={{ marginTop: 16 }}>
              <label>Update Order Status</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {Object.keys(STATUS_LABEL).map((s) => (
                  <button
                    key={s}
                    className={`btn btn-sm ${selected.status === s ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => updateStatus(selected, s)}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label>Update Payment Status</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {Object.keys(PAYMENT_LABEL).map((s) => (
                  <button
                    key={s}
                    className={`btn btn-sm ${selected.paymentStatus === s ? 'btn-success' : 'btn-outline'}`}
                    onClick={() => updatePayment(selected, s)}
                  >
                    {PAYMENT_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <Link to={`/admin/orders/${selected.id}/invoice`} className="btn btn-primary">View Invoice</Link>
              <button className="btn btn-outline" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
