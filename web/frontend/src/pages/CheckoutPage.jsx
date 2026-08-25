import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useLang } from '../context/LanguageContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { api, apiOrigin, formatPrice, categoryGradient, categoryIcon, resolveImage } from '../api.js'

const FREE_SHIP_THRESHOLD = 2000

export default function CheckoutPage() {
  const { cart, checkout } = useCart()
  const { user } = useAuth()
  const { t } = useLang()
  const toast = useToast()
  const navigate = useNavigate()
  const [placing, setPlacing] = useState(false)
  const [fields, setFields] = useState([])
  const [loadingForm, setLoadingForm] = useState(true)
  const [nepalData, setNepalData] = useState(null)
  const [payConfig, setPayConfig] = useState({ esewa: { enabled: true }, khalti: { enabled: false } })

  const [form, setForm] = useState({})
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery')
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [couponBusy, setCouponBusy] = useState(false)

  const { items, subtotal } = cart
  const deliveryFee = subtotal >= FREE_SHIP_THRESHOLD || subtotal === 0 ? 0 : 50
  const discount = coupon ? Number(coupon.amount) || 0 : 0
  const total = subtotal + deliveryFee - discount

  const applyCoupon = async (code = couponCode) => {
    const trimmed = String(code || '').trim()
    if (!trimmed) return
    setCouponBusy(true)
    setCouponError('')
    try {
      const res = await api.post('/coupons/validate', { code: trimmed, subtotal })
      if (res.valid) {
        setCoupon({ code: res.code, amount: Number(res.amount) || 0 })
      } else {
        setCoupon(null)
        setCouponError(res.message || t('coupon.invalid'))
      }
    } catch (e) {
      setCoupon(null)
      setCouponError(e.message || t('coupon.couldNotValidate'))
    } finally {
      setCouponBusy(false)
    }
  }

  useEffect(() => {
    if (coupon) {
      setCoupon(null)
      setCouponError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal])

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
    api.get('/payments/config', { auth: false })
      .then((d) => setPayConfig(d.providers || {}))
      .catch(() => {})
  }, [user])

  const paymentOptions = ['Cash on Delivery', 'Bank Transfer']
  if (user) {
    if (payConfig.esewa?.enabled) paymentOptions.push('eSewa')
    if (payConfig.khalti?.enabled) paymentOptions.push('Khalti')
  }
  const pmLabels = {
    'Cash on Delivery': t('checkout.cashOnDelivery'),
    'Bank Transfer': t('checkout.bankTransfer'),
    'eSewa': 'eSewa',
    'Khalti': 'Khalti',
  }
  const onlinePayment = paymentMethod === 'eSewa' || paymentMethod === 'Khalti'

  useEffect(() => {
    if (!user && onlinePayment) setPaymentMethod('Cash on Delivery')
  }, [user, onlinePayment])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submitEsewaForm = (action, fields) => {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = action
    form.style.display = 'none'
    for (const [key, value] of Object.entries(fields)) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = key
      input.value = value
      form.appendChild(input)
    }
    document.body.appendChild(form)
    form.submit()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const missing = fields.filter((f) => f.required && !String(form[f.key] || '').trim())
    if (missing.length > 0) {
      return toast.error(t('checkout.pleaseFillIn', { labels: missing.map((f) => f.label).join(', ') }))
    }
    setPlacing(true)
    try {
      const order = await checkout({ deliveryDetails: form, paymentMethod, couponCode: coupon ? coupon.code : String(couponCode || '').trim() })
      if (!onlinePayment) {
        toast.success(t('checkout.orderPlaced', { id: order.id }))
        navigate(`/orders?highlight=${order.id}`)
        return
      }
      const callbackBase = apiOrigin()
      if (paymentMethod === 'eSewa') {
        const init = await api.post('/payments/esewa/initiate', { orderId: order.id, callbackBase })
        submitEsewaForm(init.formUrl, init.fields)
      } else if (paymentMethod === 'Khalti') {
        const init = await api.post('/payments/khalti/initiate', { orderId: order.id, callbackBase })
        window.location.href = init.paymentUrl
      }
    } catch (err) {
      toast.error(err.message || t('checkout.orderFailed'))
      setPlacing(false)
    }
  }

  const renderField = (f) => {
    const label = (
      <label>
        {f.label}
        {f.required ? <span style={{ color: 'var(--danger)' }}> *</span> : ` ${t('common.optional')}`}
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
            <select value={value} onChange={(e) => setForm((s) => ({ ...s, province: e.target.value, district: '', city: '', ward: '', place: '' }))} required={required}>
              <option value="">{t('checkout.selectProvince')}</option>
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
            <select value={value} onChange={(e) => setForm((s) => ({ ...s, district: e.target.value, city: '', ward: '', place: '' }))} required={required} disabled={!province}>
              <option value="">{province ? t('checkout.selectDistrict') : t('checkout.selectProvinceFirst')}</option>
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
            <select value={value} onChange={(e) => setForm((s) => ({ ...s, city: e.target.value, ward: '', place: '' }))} required={required} disabled={!district}>
              <option value="">{district ? t('checkout.selectCity') : t('checkout.selectDistrictFirst')}</option>
              {(district?.cities || []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )
      }
      case 'ward': {
        const province = nepalData?.find((p) => p.name === form.province)
        const district = province?.districts?.find((d) => d.name === form.district)
        const wardOptions = (f.options && f.options.length) ? f.options : Array.from({ length: 14 }, (_, i) => String(i + 1))
        return (
          <div className="form-group" key={f.id}>
            {label}
            <select value={value} onChange={(e) => setForm((s) => ({ ...s, ward: e.target.value, place: '' }))} required={required} disabled={!form.city}>
              <option value="">{form.city ? t('checkout.selectWard') : t('checkout.selectCityFirst')}</option>
              {wardOptions.map((w) => (
                <option key={w} value={w}>{t('checkout.wardLabel', { n: w })}</option>
              ))}
            </select>
          </div>
        )
      }
      case 'place': {
        const placeOptions = f.options || []
        return (
          <div className="form-group" key={f.id}>
            {label}
            <input
              list={`places-${f.id}`}
              placeholder={f.placeholder}
              value={value}
              onChange={set(f.key)}
              required={required}
            />
            {placeOptions.length > 0 && (
              <datalist id={`places-${f.id}`}>
                {placeOptions.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            )}
          </div>
        )
      }
      case 'select':
        return (
          <div className="form-group" key={f.id}>
            {label}
            <select value={value} onChange={set(f.key)} required={required}>
              <option value="">{t('checkout.select')}</option>
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
        <h3>{t('checkout.nothing')}</h3>
        <p>{t('cart.empty')}</p>
        <Link to="/shop" className="btn btn-primary" style={{ marginTop: 16 }}>
          {t('shop.goShopping')}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="section-title">
        <h2>{t('checkout.title')}</h2>
      </div>

      <div className="cart-layout">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h1>{t('checkout.deliveryDetails')}</h1>
          <p className="sub">{t('checkout.sub')}</p>

          {!user && (
            <div className="success-banner" style={{ marginBottom: 16 }}>
              <strong>{t('checkout.guestNote1')}</strong>{' '}
              <Link to="/login" style={{ textDecoration: 'underline' }}>{t('checkout.login')}</Link>{' '}
              {t('checkout.guestNote2')}
            </div>
          )}

          {loadingForm ? (
            <div className="loading" style={{ padding: 20 }}><div className="spinner" /></div>
          ) : fields.length === 0 ? (
            <div className="error-banner">
              {t('checkout.notConfigured')}
            </div>
          ) : (
            <>
              {fields.map(renderField)}
              <div className="form-group">
                <label>{t('checkout.paymentMethod')}</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {paymentOptions.map((o) => (
                    <option key={o} value={o}>{pmLabels[o] || o}</option>
                  ))}
                </select>
                {(paymentMethod === 'eSewa' && payConfig.esewa?.testMode) ||
                (paymentMethod === 'Khalti' && payConfig.khalti?.testMode) ? (
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {t('checkout.testMode', { method: pmLabels[paymentMethod] || paymentMethod })}
                  </p>
                ) : null}
                {onlinePayment && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {t('checkout.redirectNote', { method: pmLabels[paymentMethod] || paymentMethod })}
                  </p>
                )}
              </div>
              <div className="form-group">
                <label>{t('coupon.label')}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder={t('coupon.placeholder')}
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value)
                      if (coupon) setCoupon(null)
                      setCouponError('')
                    }}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => applyCoupon()}
                    disabled={couponBusy || !String(couponCode || '').trim()}
                  >
                    {couponBusy ? '...' : t('checkout.apply')}
                  </button>
                </div>
                {coupon ? (
                  <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>
                    {t('coupon.appliedNote', { code: coupon.code, amount: formatPrice(coupon.amount) })}
                  </p>
                ) : couponError ? (
                  <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{couponError}</p>
                ) : null}
              </div>
              <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={placing}>
                {placing
                  ? onlinePayment
                    ? t('checkout.redirecting', { method: pmLabels[paymentMethod] || paymentMethod })
                    : t('checkout.placing')
                  : t('checkout.placeOrderTotal', { total: formatPrice(total) })}
              </button>
            </>
          )}
        </form>

        <div className="summary-card">
          <h3>{t('cart.summary')}</h3>
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
                      src={resolveImage(item.product.image)}
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
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('checkout.qty', { n: item.quantity })}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {formatPrice(item.product.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>
          <div className="sum-row">
            <span>{t('common.subtotal')}</span>
            <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{formatPrice(subtotal)}</span>
          </div>
          <div className="sum-row">
            <span>{t('common.deliveryFee')}</span>
            <span>{deliveryFee === 0 ? t('cart.free') : formatPrice(deliveryFee)}</span>
          </div>
          {discount > 0 && (
            <div className="sum-row">
              <span>{t('checkout.discount', { code: coupon ? coupon.code : '' })}</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>− {formatPrice(discount)}</span>
            </div>
          )}
          <div className="sum-row total">
            <span>{t('common.total')}</span>
            <span style={{ color: 'var(--primary)' }}>{formatPrice(total)}</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
            {t('checkout.pricesNote')}
          </p>
        </div>
      </div>
    </div>
  )
}
