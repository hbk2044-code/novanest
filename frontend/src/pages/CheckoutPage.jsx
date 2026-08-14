import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { api, formatPrice, categoryGradient, categoryIcon } from '../api.js'

const FREE_SHIP_THRESHOLD = 2000

export default function CheckoutPage() {
  const { cart, checkout } = useCart()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [placing, setPlacing] = useState(false)
  const [fields, setFields] = useState([])
  const [loadingForm, setLoadingForm] = useState(true)
  const [nepalData, setNepalData] = useState(null)

  const [form, setForm] = useState({})
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery')

  useEffect(() => {
    api.get('/settings/checkout-fields', { auth: false })
      .then((d) => {
        const fs = d.fields || []
        setFields(fs)
        const defaults = {}
        for (const f of fs) {
          if (f.key === 'fullName' && user?.name) defaults[f.key] = user.name
          else if (f.key === 'email' && user?.email) defaults[f.key] = user.email
          else if (f.key === 'phone' && user?.phone) defaults[f.key] = user.phone
          else if (f.key === 'shippingAddress' && user?.address) defaults[f.key] = user.address
          else defaults[f.key] = ''
        }
        setForm(defaults)
      })
      .catch(() => {})
      .finally(() => setLoadingForm(false))
    api.get('/settings/nepal-address', { auth: false })
      .then((d) => setNepalData(d.provinces || []))
      .catch(() => setNepalData([]))
  }, [user])

  const { items, subtotal } = cart
  const deliveryFee = subtotal >= FREE_SHIP_THRESHOLD || subtotal === 0 ? 0 : 50
  const total = subtotal + deliveryFee

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const missing = fields.filter((f) => f.required && !String(form[f.key] || '').trim())
    if (missing.length > 0) {
      return toast.error(`Please fill in: ${missing.map((f) => f.label).join(', ')}`)
    }
    setPlacing(true)
    try {
      const order = await checkout({ deliveryDetails: form, paymentMethod })
      toast.success(`Order #${order.id} placed successfully!`)
      navigate(`/orders?highlight=${order.id}`)
    } catch (err) {
      toast.error(err.message || 'Order failed')
    } finally {
      setPlacing(false)
    }
  }

  const renderField = (f) => {
    const label = (
      <label>
        {f.label}
        {f.required ? <span style={{ color: 'var(--danger)' }}> *</span> : ' (optional)'}
      </label>
    )
    const value = form[f.key] || ''
    const required = f.required
    switch (f.type) {
      case 'textarea':
        return (
          <div className="form-group" key={f.id}>
            {label}
            <textarea
              rows="3"
              placeholder={f.placeholder}
              value={value}
              onChange={set(f.key)}
              required={required}
            />
          </div>
        )
      case 'province':
        return (
          <div className="form-group" key={f.id}>
            {label}
            <select value={value} onChange={(e) => setForm((s) => ({ ...s, province: e.target.value, district: '', city: '' }))} required={required}>
              <option value="">Select province...</option>
              {(nepalData || []).map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        )
      case 'district': {
        const province = nepalData?.find((p) => p.name === form.province)
        return (
          <div className="form-group" key={f.id}>
            {label}
            <select value={value} onChange={(e) => setForm((s) => ({ ...s, district: e.target.value, city: '' }))} required={required} disabled={!province}>
              <option value="">{province ? 'Select district...' : 'Select province first'}</option>
              {(province?.districts || []).map((d) => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        )
      }
      case 'city': {
        const province = nepalData?.find((p) => p.name === form.province)
        const district = province?.districts?.find((d) => d.name === form.district)
        return (
          <div className="form-group" key={f.id}>
            {label}
            <select value={value} onChange={set(f.key)} required={required} disabled={!district}>
              <option value="">{district ? 'Select city...' : 'Select district first'}</option>
              {(district?.cities || []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )
      }
      case 'select':
        return (
          <div className="form-group" key={f.id}>
            {label}
            <select value={value} onChange={set(f.key)} required={required}>
              <option value="">Select...</option>
              {(f.options || []).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        )
      case 'number':
        return (
          <div className="form-group" key={f.id}>
            {label}
            <input type="number" placeholder={f.placeholder} value={value} onChange={set(f.key)} required={required} />
          </div>
        )
      case 'email':
        return (
          <div className="form-group" key={f.id}>
            {label}
            <input type="email" placeholder={f.placeholder} value={value} onChange={set(f.key)} required={required} />
          </div>
        )
      case 'tel':
        return (
          <div className="form-group" key={f.id}>
            {label}
            <input type="tel" placeholder={f.placeholder} value={value} onChange={set(f.key)} required={required} />
          </div>
        )
      default:
        return (
          <div className="form-group" key={f.id}>
            {label}
            <input type="text" placeholder={f.placeholder} value={value} onChange={set(f.key)} required={required} />
          </div>
        )
    }
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="big-icon">🧺</div>
        <h3>Nothing to check out</h3>
        <p>Your cart is empty.</p>
        <Link to="/shop" className="btn btn-primary" style={{ marginTop: 16 }}>
          Go Shopping
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="section-title">
        <h2>Checkout</h2>
      </div>

      <div className="cart-layout">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h1>Delivery Details</h1>
          <p className="sub">Tell us where to send your order.</p>

          {loadingForm ? (
            <div className="loading" style={{ padding: 20 }}><div className="spinner" /></div>
          ) : fields.length === 0 ? (
            <div className="error-banner">
              The checkout form is not configured yet. Please contact support.
            </div>
          ) : (
            <>
              {fields.map(renderField)}
              <div className="form-group">
                <label>Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option>Cash on Delivery</option>
                  <option>eSewa</option>
                  <option>Khalti</option>
                  <option>Bank Transfer</option>
                </select>
              </div>
              <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={placing}>
                {placing ? 'Placing Order...' : `Place Order · ${formatPrice(total)}`}
              </button>
            </>
          )}
        </form>

        <div className="summary-card">
          <h3>Order Summary</h3>
          <div style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 12 }}>
            {items.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    background: categoryGradient(item.product.categorySlug || ''),
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {item.product.image ? (
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    categoryIcon(item.product.categorySlug || '')
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.product.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Qty: {item.quantity}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {formatPrice(item.product.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>
          <div className="sum-row">
            <span>Subtotal</span>
            <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{formatPrice(subtotal)}</span>
          </div>
          <div className="sum-row">
            <span>Delivery Fee</span>
            <span>{deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}</span>
          </div>
          <div className="sum-row total">
            <span>Total</span>
            <span style={{ color: 'var(--primary)' }}>{formatPrice(total)}</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
            All prices are in Nepalese Rupees (Rs.).
          </p>
        </div>
      </div>
    </div>
  )
}
