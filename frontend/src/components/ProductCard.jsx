import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice, categoryGradient, categoryIcon } from '../api.js'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from './Toast.jsx'

export default function ProductCard({ product, compact }) {
  const { user } = useAuth()
  const { addToCart } = useCart()
  const toast = useToast()
  const [imgFailed, setImgFailed] = useState(false)
  const gradient = categoryGradient(product.categorySlug)
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0

  const showImage = product.image && !imgFailed

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      await addToCart(product.id, 1)
      toast.success(`${product.name} added to cart`)
    } catch (err) {
      toast.error(err.message || 'Could not add to cart')
    }
  }

  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <div className="p-image" style={{ background: gradient }}>
        {discount > 0 && <span className="discount-tag">-{discount}%</span>}
        {showImage ? (
          <img
            src={product.image}
            alt={product.name}
            onError={() => setImgFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span>{categoryIcon(product.categorySlug)}</span>
        )}
      </div>
      <div className="p-body">
        <span className="p-cat">{product.categoryName}</span>
        <h3>{product.name}</h3>
        <div className="p-rating">
          {'★'.repeat(Math.round(product.rating))}
          <span style={{ color: 'var(--muted)', fontWeight: 500 }}>
            {' '}
            {product.rating}
          </span>
        </div>
        <div className="price-row">
          <span className="price">{formatPrice(product.price)}</span>
          {product.oldPrice && (
            <span className="old-price">{formatPrice(product.oldPrice)}</span>
          )}
        </div>
        {product.stock <= 0 ? (
          <span className="stock-msg">Out of stock</span>
        ) : product.stock <= 10 ? (
          <span className="stock-msg">Only {product.stock} left</span>
        ) : null}
        <button
          className="btn btn-primary btn-sm add-cart"
          onClick={handleAdd}
          disabled={product.stock <= 0}
        >
          Add to Cart
        </button>
      </div>
    </Link>
  )
}
