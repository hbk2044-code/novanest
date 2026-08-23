import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, formatPrice } from '../api.js'
import { useLang } from '../context/LanguageContext.jsx'
import { useCart } from '../context/CartContext.jsx'

export default function PaymentResultPage() {
  const { t } = useLang()
  const { clearCart } = useCart()
  const [params] = useSearchParams()
  const [verifying, setVerifying] = useState(true)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const provider = params.get('provider')
    const orderId = params.get('orderId')
    const token = params.get('token') || ''
    if (!provider || !orderId) {
      setError(t('payment.missingDetails'))
      setVerifying(false)
      return
    }

    const verify = async () => {
      try {
        if (provider === 'esewa') {
          const data = params.get('data')
          const signature = params.get('signature')
          if (!data || !signature) {
            setError(t('payment.esewaMissing'))
            setVerifying(false)
            return
          }
          const d = await api.post('/payments/esewa/verify', { orderId, data, signature, token })
          setResult({ success: d.success, order: d.order })
          if (d.success) {
            try { await clearCart() } catch (e) {}
          }
        } else if (provider === 'khalti') {
          const status = params.get('status')
          if (status && String(status).toLowerCase() !== 'completed') {
            setError(t('payment.khaltiIncomplete', { status }))
            setVerifying(false)
            return
          }
          const d = await api.post('/payments/khalti/verify', {
            orderId,
            pidx: params.get('pidx'),
            token,
          })
          setResult({ success: d.success, order: d.order })
          if (d.success) {
            try { await clearCart() } catch (e) {}
          }
        } else {
          setError(t('payment.unknownProvider'))
          setVerifying(false)
        }
      } catch (err) {
        setError(err.message || t('payment.verifyFailed'))
        setVerifying(false)
      }
    }
    verify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  return (
    <div className="empty-state" style={{ maxWidth: 520, margin: '0 auto' }}>
      {verifying ? (
        <>
          <div className="loading"><div className="spinner" /> {t('payment.verifying')}</div>
        </>
      ) : result?.success ? (
        <>
          <div className="big-icon">✅</div>
          <h3>{t('payment.success')}</h3>
          <p>
            {t('payment.paidMsg', { id: result.order.id, total: formatPrice(result.order.total) })}
          </p>
          <Link to={`/orders?highlight=${result.order.id}`} className="btn btn-primary" style={{ marginTop: 16 }}>
            {t('payment.viewOrders')}
          </Link>
        </>
      ) : (
        <>
          <div className="big-icon">⚠️</div>
          <h3>{t('payment.notConfirmed')}</h3>
          <p>{error}</p>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            {t('payment.supportNote')}
          </p>
          <Link to="/orders" className="btn btn-primary" style={{ marginTop: 16 }}>
            {t('payment.goToOrders')}
          </Link>
          <Link to="/cart" className="btn btn-outline" style={{ marginTop: 16 }}>
            {t('payment.backToCart')}
          </Link>
        </>
      )}
    </div>
  )
}
