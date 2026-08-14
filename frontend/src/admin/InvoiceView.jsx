import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api, formatPrice, formatDate } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import { useBranding } from '../context/BrandingContext.jsx'

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

export default function InvoiceView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { branding } = useBranding()
  const [order, setOrder] = useState(null)
  const [store, setStore] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get(`/admin/orders/${id}`),
      api.get('/admin/settings/store-info'),
    ])
      .then(([o, s]) => {
        setOrder(o.order)
        setStore(s.storeInfo)
      })
      .catch((err) => setError(err.message || 'Could not load invoice'))
      .finally(() => setLoading(false))
  }, [id])

  const invoiceNo = `INV-${String(order?.id || '').padStart(4, '0')}`

  const deliveryLines = () => {
    if (!order) return []
    const d = order.deliveryDetails || {}
    const entries = Object.entries(d)
    if (entries.length > 0) {
      return entries.map(([k, v]) => ({
        label: k.replace(/([A-Z])/g, ' $1').trim().replace(/^./, (c) => c.toUpperCase()),
        value: v || '—',
      }))
    }
    return [
      { label: 'Ship To', value: order.shippingAddress || '—' },
      { label: 'Phone', value: order.phone || '—' },
    ]
  }

  const shareText = () => {
    if (!order || !store) return ''
    const items = order.items.map((i) => `${i.productName} x${i.quantity} = ${formatPrice(i.price * i.quantity)}`).join('\n')
    const customer = deliveryLines().map((l) => `${l.label}: ${l.value}`).join('\n')
    return [
      `${store.companyName} — Invoice ${invoiceNo}`,
      `Date: ${formatDate(order.createdAt)}`,
      `Customer: ${order.customer} (${order.email})`,
      '',
      items,
      '',
      `Subtotal: ${formatPrice(order.subtotal)}`,
      `Delivery: ${order.deliveryFee === 0 ? 'FREE' : formatPrice(order.deliveryFee)}`,
      `Total: ${formatPrice(order.total)}`,
      `Payment: ${order.paymentMethod} (${PAYMENT_LABEL[order.paymentStatus] || order.paymentStatus})`,
      `Status: ${STATUS_LABEL[order.status]}`,
      '',
      customer,
    ].join('\n')
  }

  const shareEmail = () => {
    const subject = encodeURIComponent(`Invoice ${invoiceNo} from ${store?.companyName || 'NovaNest'}`)
    const body = encodeURIComponent(shareText())
    window.open(`mailto:${order?.email || ''}?subject=${subject}&body=${body}`, '_blank')
  }

  const shareWhatsApp = () => {
    const phone = (order?.deliveryDetails?.phone || order?.phone || '').replace(/[^0-9]/g, '')
    const url = `https://wa.me/${phone ? '977' + phone.replace(/^977/, '') : ''}?text=${encodeURIComponent(shareText())}`
    window.open(url, '_blank')
  }

  const printInvoice = () => {
    window.print()
  }

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading invoice...</div>
  }

  if (error || !order) {
    return (
      <div className="empty-state">
        <div className="big-icon">🧾</div>
        <h3>Invoice not found</h3>
        <p>{error || 'This order does not exist.'}</p>
        <Link to="/admin/orders" className="btn btn-primary" style={{ marginTop: 16 }}>Back to Orders</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="invoice-actions no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <Link to="/admin/orders" className="btn btn-outline btn-sm">← Back to Orders</Link>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={printInvoice}>🖨️ Print / Save PDF</button>
          <button className="btn btn-secondary btn-sm" onClick={shareEmail}>✉️ Email</button>
          <button className="btn btn-success btn-sm" onClick={shareWhatsApp}>💬 WhatsApp</button>
        </div>
      </div>

      <div className="invoice-sheet" id="invoice-sheet">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
          <div>
            <div className="invoice-brand">
              {branding?.logo ? (
                <img src={branding.logo} alt={branding.appName || 'logo'} style={{ height: 40, width: 'auto', objectFit: 'contain', verticalAlign: 'middle' }} />
              ) : (
                <>{branding?.icon || '🛍️'} </>
              )}
              {store?.companyName || branding?.appName || 'NovaNest'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{store?.tagline || ''}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>
              {store?.address}
              <br />{store?.phone}
              <br />{store?.email}
              {store?.pan ? <><br />PAN: {store.pan}</> : null}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)', letterSpacing: 1 }}>INVOICE</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>{invoiceNo}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{formatDate(order.createdAt)}</div>
            <div style={{ marginTop: 8 }}>
              <span className={`badge badge-${order.status}`}>{STATUS_LABEL[order.status]}</span>{' '}
              <span className={`badge badge-pay-${order.paymentStatus}`}>{PAYMENT_LABEL[order.paymentStatus] || order.paymentStatus}</span>
            </div>
          </div>
        </div>

        <div className="invoice-billto">
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)' }}>Billed To</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{order.customer}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{order.email}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--muted)' }}>
            <strong style={{ color: 'var(--ink)' }}>Payment Method:</strong> {order.paymentMethod}
            <br />
            <strong style={{ color: 'var(--ink)' }}>Payment Status:</strong> {PAYMENT_LABEL[order.paymentStatus] || order.paymentStatus}
          </div>
        </div>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>Item</th>
              <th className="inv-num">Qty</th>
              <th className="inv-num">Price</th>
              <th className="inv-num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={i}>
                <td>{item.productName}</td>
                <td className="inv-num">{item.quantity}</td>
                <td className="inv-num">{formatPrice(item.price)}</td>
                <td className="inv-num" style={{ fontWeight: 700 }}>{formatPrice(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, marginTop: 18 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Delivery Details</div>
            {deliveryLines().map((l) => (
              <div key={l.label}><strong style={{ color: 'var(--ink)' }}>{l.label}:</strong> {l.value}</div>
            ))}
          </div>
          <div>
            <div className="sum-row"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
            <div className="sum-row"><span>Delivery</span><span>{order.deliveryFee === 0 ? 'FREE' : formatPrice(order.deliveryFee)}</span></div>
            <div className="invoice-total">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
            {store?.bankName ? (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
                <strong style={{ color: 'var(--ink)' }}>Bank:</strong> {store.bankName}
                {store.bankAccount ? <><br />Account: {store.bankAccount}</> : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="invoice-footer">
          Thank you for shopping with {store?.companyName || 'NovaNest'}!
          <br />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>All prices are in Nepalese Rupees (Rs.). This is a system-generated invoice.</span>
        </div>
      </div>
    </div>
  )
}
