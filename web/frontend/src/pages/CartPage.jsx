import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useLang } from '../context/LanguageContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { formatPrice, categoryGradient, categoryIcon, resolveImage } from '../api.js'

const FREE_SHIP_THRESHOLD = 2000

export default function CartPage() {
  const { cart, updateQty, removeItem, clearCart } = useCart()
  const { t } = useLang()
  const toast = useToast()
  const { items, subtotal } = cart
  const deliveryFee = subtotal >= FREE_SHIP_THRESHOLD || subtotal === 0 ? 0 : 50
  const total = subtotal + deliveryFee
  const remaining = Math.max(0, FREE_SHIP_THRESHOLD - subtotal)

  const handleQty = async (itemId, qty) => {
    try {
      await updateQty(itemId, qty)
    } catch (e) {
      toast.error(e.message || t('cart.updateFailed'))
    }
  }

  const handleRemove = async (itemId, name) => {
    try {
      await removeItem(itemId)
      toast.success(t('cart.removed', { name }))
    } catch (e) {
      toast.error(e.message || t('cart.removeFailed'))
    }
  }

  const handleClear = async () => {
    if (!window.confirm(t('header.clearCart'))) return
    try {
      await clearCart()
      toast.success(t('header.cartCleared'))
    } catch (e) {
      toast.error(e.message || t('header.clearFailed'))
    }
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="big-icon">🛒</div>
        <h3>{t('cart.empty')}</h3>
        <p>{t('cart.emptySub')}</p>
        <Link to="/shop" className="btn btn-primary" style={{ marginTop: 16 }}>
          {t('home.startShopping')}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="section-title">
        <h2>{t('cart.count', { n: items.length })}</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn btn-outline btn-sm" onClick={handleClear}>
            {t('cart.clear')}
          </button>
          <Link to="/shop" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 14 }}>
            ← {t('cart.continueShopping')}
          </Link>
        </div>
      </div>

      <div className="cart-layout">
        <div>
          {items.map((item) => (
            <div key={item.id} className="cart-item">
              <div
                className="ci-image"
                style={{
                  background: categoryGradient(item.product.categorySlug || ''),
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
              <div className="ci-info">
                <h4>{item.product.name}</h4>
                <p>{t('cart.each', { price: formatPrice(item.product.price) })}</p>
                {item.product.stock <= 10 && (
                  <p style={{ color: 'var(--danger)' }}>{t('product.onlyLeft', { n: item.product.stock })}</p>
                )}
                <div className="qty-selector" style={{ marginTop: 8, marginBottom: 0 }}>
                  <button onClick={() => handleQty(item.id, item.quantity - 1)}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => handleQty(item.id, item.quantity + 1)}>+</button>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>
                  {formatPrice(item.product.price * item.quantity)}
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ marginTop: 10 }}
                  onClick={() => handleRemove(item.id, item.product.name)}
                >
                  {t('cart.remove')}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="summary-card">
          <h3>{t('cart.summary')}</h3>
          {remaining > 0 ? (
            <div className="free-ship-note">
              {t('cart.freeShipAdd', { amount: formatPrice(remaining) })}
              <div className="progress">
                <span style={{ width: `${Math.min(100, (subtotal / FREE_SHIP_THRESHOLD) * 100)}%` }} />
              </div>
            </div>
          ) : (
            <div className="free-ship-note">{t('cart.freeShipUnlocked')}</div>
          )}
          <div className="sum-row">
            <span>{t('common.subtotal')}</span>
            <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{formatPrice(subtotal)}</span>
          </div>
          <div className="sum-row">
            <span>{t('common.deliveryFee')}</span>
            <span>{deliveryFee === 0 ? t('cart.free') : formatPrice(deliveryFee)}</span>
          </div>
          <div className="sum-row total">
            <span>{t('common.total')}</span>
            <span style={{ color: 'var(--primary)' }}>{formatPrice(total)}</span>
          </div>
          <Link to="/checkout" className="btn btn-primary btn-lg btn-block" style={{ marginTop: 18 }}>
            {t('cart.checkout')}
          </Link>
        </div>
      </div>
    </div>
  )
}
