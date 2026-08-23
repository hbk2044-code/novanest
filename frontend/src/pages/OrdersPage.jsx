import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, formatPrice, formatDate, categoryGradient, categoryIcon } from '../api.js'
import { useLang } from '../context/LanguageContext.jsx'
import { useToast } from '../components/Toast.jsx'

export default function OrdersPage() {
  const { t } = useLang()
  const [params] = useSearchParams()
  const highlight = Number(params.get('highlight'))
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const toast = useToast()

  const STATUS_LABEL = {
    pending: t('orders.statusPending'),
    confirmed: t('orders.statusConfirmed'),
    shipped: t('orders.statusShipped'),
    delivered: t('orders.statusDelivered'),
    cancelled: t('orders.statusCancelled'),
  }

  const PAYMENT_LABEL = {
    pending: t('orders.payPending'),
    paid: t('orders.payPaid'),
    refunded: t('orders.payRefunded'),
    failed: t('orders.payFailed'),
  }

  const cancelOrder = async (order) => {
    if (!window.confirm(t('orders.cancelConfirm', { id: order.id }))) return
    setCancelling(true)
    try {
      const res = await api.post(`/orders/${order.id}/cancel`)
      setSelected(res.order)
      setOrders((list) => list.map((o) => (o.id === order.id ? res.order : o)))
      toast.success(t('orders.cancelled', { id: order.id }))
    } catch (err) {
      toast.error(err.message || t('orders.cancelFailed'))
    } finally {
      setCancelling(false)
    }
  }

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
        <h2>{t('orders.title')}</h2>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> {t('orders.loading')}</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="big-icon">📦</div>
          <h3>{t('orders.noOrdersTitle')}</h3>
          <p>{t('orders.noOrdersSub')}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('orders.orderNo')}</th>
                <th>{t('orders.date')}</th>
                <th>{t('orders.items')}</th>
                <th>{t('orders.payment')}</th>
                <th>{t('orders.total')}</th>
                <th>{t('orders.status')}</th>
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
                      {t('orders.view')}
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
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('orders.deliveryDetails')}</div>
              {Object.keys(selected.deliveryDetails || {}).length > 0 ? (
                Object.entries(selected.deliveryDetails).map(([k, v]) => (
                  <div key={k} style={{ textTransform: 'capitalize' }}>
                    <strong>{k.replace(/([A-Z])/g, ' $1').trim()}:</strong> {v || '—'}
                  </div>
                ))
              ) : (
                <>
                  <div><strong>{t('orders.shipTo')}</strong> {selected.shippingAddress}</div>
                  <div><strong>{t('orders.phone')}</strong> {selected.phone}</div>
                </>
              )}
              <div><strong>{t('orders.paymentLabel')}</strong> {selected.paymentMethod}</div>
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
              <span>{t('common.subtotal')}</span>
              <span>{formatPrice(selected.subtotal)}</span>
            </div>
            <div className="sum-row">
              <span>{t('orders.delivery')}</span>
              <span>{selected.deliveryFee === 0 ? t('cart.free') : formatPrice(selected.deliveryFee)}</span>
            </div>
            {selected.discount > 0 && (
              <div className="sum-row">
                <span>{t('checkout.discount', { code: selected.coupon ? selected.coupon.code : '' })}</span>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>− {formatPrice(selected.discount)}</span>
              </div>
            )}
            <div className="sum-row total">
              <span>{t('common.total')}</span>
              <span style={{ color: 'var(--primary)' }}>{formatPrice(selected.total)}</span>
            </div>

            <div className="modal-actions">
              {['pending', 'confirmed'].includes(selected.status) && (
                <button
                  className="btn btn-danger"
                  onClick={() => cancelOrder(selected)}
                  disabled={cancelling}
                >
                  {cancelling ? t('orders.cancelling') : t('orders.cancelOrder')}
                </button>
              )}
              <button className="btn btn-outline" onClick={() => setSelected(null)}>{t('orders.close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
