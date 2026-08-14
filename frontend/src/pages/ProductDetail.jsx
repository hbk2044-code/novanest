import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api, formatPrice, categoryGradient, categoryIcon } from '../api.js'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import ProductCard from '../components/ProductCard.jsx'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToCart } = useCart()
  const toast = useToast()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [qty, setQty] = useState(1)
  const [error, setError] = useState('')
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    setError('')
    setProduct(null)
    setImgFailed(false)
    api.get(`/products/${id}`)
      .then((d) => {
        setProduct(d.product)
        setRelated(d.related)
      })
      .catch((e) => setError(e.message))
  }, [id])

  if (error) {
    return (
      <div className="empty-state">
        <div className="big-icon">😕</div>
        <h3>{error}</h3>
        <Link to="/shop" className="btn btn-primary" style={{ marginTop: 16 }}>
          Back to Shop
        </Link>
      </div>
    )
  }

  if (!product) {
    return <div className="loading"><div className="spinner" /> Loading...</div>
  }

  const handleAdd = async () => {
    try {
      await addToCart(product.id, qty)
      toast.success(`${qty} × ${product.name} added to cart`)
    } catch (err) {
      toast.error(err.message || 'Could not add to cart')
    }
  }

  const handleBuyNow = async () => {
    try {
      await addToCart(product.id, qty)
      navigate('/checkout')
    } catch (err) {
      toast.error(err.message || 'Could not add to cart')
    }
  }

  const gradient = categoryGradient(product.categorySlug)
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link to="/shop" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 14 }}>
          ← Back to Shop
        </Link>
      </div>

      <div className="detail-wrap">
        <div className="detail-image" style={{ background: gradient, position: 'relative', overflow: 'hidden' }}>
          {discount > 0 && (
            <span
              className="discount-tag"
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                background: 'var(--danger)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                padding: '6px 14px',
                borderRadius: 100,
                zIndex: 2,
              }}
            >
              SAVE {discount}%
            </span>
          )}
          {product.image && !imgFailed ? (
            <img
              src={product.image}
              alt={product.name}
              onError={() => setImgFailed(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 170, lineHeight: 1 }}>{categoryIcon(product.categorySlug)}</span>
          )}
        </div>

        <div className="detail-info">
          <span className="cat-tag">{product.categoryName}</span>
          <h1>{product.name}</h1>
          <div className="p-rating" style={{ fontSize: 15 }}>
            {'★'.repeat(Math.round(product.rating))} <span style={{ color: 'var(--muted)' }}>{product.rating} · {product.sold} sold</span>
          </div>
          <div className="detail-price">
            <span className="price">{formatPrice(product.price)}</span>
            {product.oldPrice && (
              <span className="old-price">{formatPrice(product.oldPrice)}</span>
            )}
          </div>
          <p className="detail-desc">{product.description}</p>

          <div style={{ marginBottom: 14, fontSize: 14 }}>
            {product.stock > 0 ? (
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                ✓ In stock — {product.stock} available
              </span>
            ) : (
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Out of stock</span>
            )}
          </div>

          <div className="qty-selector">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span>{qty}</span>
            <button onClick={() => setQty((q) => Math.min(product.stock || 1, q + 1))}>+</button>
          </div>

          <div className="detail-actions">
            <button
              className="btn btn-secondary btn-lg"
              onClick={handleAdd}
              disabled={product.stock <= 0}
            >
              🛒 Add to Cart
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleBuyNow}
              disabled={product.stock <= 0}
            >
              Buy Now
            </button>
          </div>

          {!user && (
            <p style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                Login
              </Link>{' '}
              or{' '}
              <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                Sign up
              </Link>{' '}
              to place orders.
            </p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section style={{ marginTop: 56 }}>
          <div className="section-title">
            <h2>You may also like</h2>
          </div>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
