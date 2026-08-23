import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api, formatPrice, categoryGradient, categoryIcon, resolveImage } from '../api.js'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useLang } from '../context/LanguageContext.jsx'
import { useToast } from '../components/Toast.jsx'
import ProductCard from '../components/ProductCard.jsx'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToCart } = useCart()
  const { t } = useLang()
  const toast = useToast()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [qty, setQty] = useState(1)
  const [error, setError] = useState('')
  const [imgFailed, setImgFailed] = useState(false)
  const [activeImage, setActiveImage] = useState('')
  const [reviewData, setReviewData] = useState({ reviews: [], summary: { average: 0, count: 0, byStars: {} }, canReview: false })
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewName, setReviewName] = useState('')
  const [reviewImages, setReviewImages] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    setError('')
    setProduct(null)
    setImgFailed(false)
    setActiveImage('')
    api.get(`/products/${id}`)
      .then((d) => {
        setProduct(d.product)
        setRelated(d.related)
        const imgs = d.product.images && d.product.images.length ? d.product.images : d.product.image ? [d.product.image] : []
        setActiveImage(imgs[0] || '')
      })
      .catch((e) => setError(e.message))
    api.get(`/products/${id}/reviews`)
      .then(setReviewData)
      .catch(() => {})
  }, [id])

  if (error) {
    return (
      <div className="empty-state">
        <div className="big-icon">😕</div>
        <h3>{error}</h3>
        <Link to="/shop" className="btn btn-primary" style={{ marginTop: 16 }}>
          {t('product.backToShop')}
        </Link>
      </div>
    )
  }

  if (!product) {
    return <div className="loading"><div className="spinner" /> {t('common.loading')}</div>
  }

  const handleAdd = async () => {
    try {
      await addToCart(product.id, qty)
      toast.success(t('product.addedToCartCount', { qty, name: product.name }))
    } catch (err) {
      toast.error(err.message || t('product.addFailed'))
    }
  }

  const handleBuyNow = async () => {
    try {
      await addToCart(product.id, qty)
      navigate('/checkout')
    } catch (err) {
      toast.error(err.message || t('product.addFailed'))
    }
  }

  const gradient = categoryGradient(product.categorySlug)
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0
  const images = product.images && product.images.length ? product.images : product.image ? [product.image] : []
  const mainImage = activeImage || images[0] || ''
  const { reviews, summary, canReview } = reviewData
  const ratingCount = product.ratingCount || summary.count || 0

  const loadReviews = () => api.get(`/products/${id}/reviews`).then(setReviewData).catch(() => {})

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!reviewComment.trim()) return toast.error(t('product.reviewNeeded'))
    setSubmittingReview(true)
    try {
      const fd = new FormData()
      fd.append('rating', reviewRating)
      fd.append('comment', reviewComment.trim())
      if (!user) fd.append('name', reviewName.trim() || 'Guest')
      for (const f of reviewImages) fd.append('images', f)
      if (editingId) {
        await api.putForm(`/reviews/${editingId}`, fd)
        toast.success(t('product.reviewSubmittedEdit'))
      } else {
        await api.postForm(`/products/${id}/reviews`, fd)
        toast.success(t('product.reviewSubmitted'))
      }
      setReviewComment('')
      setReviewName('')
      setReviewImages([])
      setReviewRating(5)
      setEditingId(null)
      await loadReviews()
    } catch (err) {
      toast.error(err.message || t('product.reviewFailed'))
    } finally {
      setSubmittingReview(false)
    }
  }

  const startEditReview = (r) => {
    setEditingId(r.id)
    setReviewRating(r.rating)
    setReviewComment(r.comment)
    setReviewImages([])
    const formEl = document.getElementById('review-form')
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const cancelEditReview = () => {
    setEditingId(null)
    setReviewRating(5)
    setReviewComment('')
    setReviewImages([])
  }

  const handleDeleteReview = async (r) => {
    if (!window.confirm(t('product.deleteReviewConfirm'))) return
    try {
      await api.del(`/reviews/${r.id}`)
      toast.success(t('product.reviewDeleted'))
      await loadReviews()
    } catch (err) {
      toast.error(err.message || t('product.reviewDeleteFailed'))
    }
  }

  const reviewFormTitle = editingId ? t('product.editReview') : t('product.writeReview')

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link to="/shop" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 14 }}>
          ← {t('product.backToShop')}
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
              {t('product.save', { n: discount })}
            </span>
          )}
          {mainImage && !imgFailed ? (
            <img
              src={resolveImage(mainImage)}
              alt={product.name}
              onError={() => setImgFailed(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 170, lineHeight: 1 }}>{categoryIcon(product.categorySlug)}</span>
          )}
          {images.length > 1 && (
            <div
              style={{
                position: 'absolute',
                bottom: 12,
                left: 12,
                right: 12,
                display: 'flex',
                gap: 8,
                justifyContent: 'center',
                zIndex: 3,
              }}
            >
              {images.map((img, i) => (
                <button
                  key={`${img}-${i}`}
                  type="button"
                  onClick={() => { setActiveImage(img); setImgFailed(false) }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: img === mainImage ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.6)',
                    padding: 0,
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <img src={resolveImage(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-info">
          <span className="cat-tag">{product.categoryName}</span>
          <h1>{product.name}</h1>
          <div className="p-rating" style={{ fontSize: 15 }}>
            {'★'.repeat(Math.round(product.rating || summary.average || 0))}{' '}
            <span style={{ color: 'var(--muted)' }}>
              {ratingCount > 0
                ? `${product.rating || summary.average} (${ratingCount} ${ratingCount === 1 ? t('product.review') : t('product.reviews')}) · `
                : ''}
              {t('product.soldCount', { n: product.sold })}
            </span>
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
                ✓ {t('product.inStockAvailable', { n: product.stock })}
              </span>
            ) : (
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{t('product.outOfStock')}</span>
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
              🛒 {t('product.addToCart')}
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleBuyNow}
              disabled={product.stock <= 0}
            >
              {t('product.buyNow')}
            </button>
          </div>

          {!user && (
            <p style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
              {t('product.guestNote1')}{' '}
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                {t('auth.login')}
              </Link>{' '}
              {t('product.guestNote2')}
            </p>
          )}
        </div>
      </div>

      <section style={{ marginTop: 48 }}>
        <div className="section-title">
          <h2>{t('product.customerReviews')}</h2>
        </div>
        {summary.count > 0 ? (
          <div className="reviews-summary">
            <div style={{ textAlign: 'center', minWidth: 120 }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--ink)' }}>{summary.average}</div>
              <div style={{ color: '#f5a623', fontSize: 16, letterSpacing: 2 }}>{'★'.repeat(Math.round(summary.average))}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{summary.count} {summary.count === 1 ? t('product.review') : t('product.reviews')}</div>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              {[5, 4, 3, 2, 1].map((s) => {
                const n = summary.byStars?.[s] || 0
                const pct = summary.count ? Math.round((n / summary.count) * 100) : 0
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, marginBottom: 4 }}>
                    <span style={{ width: 30 }}>{s}★</span>
                    <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#f5a623' }} />
                    </div>
                    <span style={{ width: 24, color: 'var(--muted)', textAlign: 'right' }}>{n}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>{t('product.noReviews')}</p>
        )}

        {canReview && (
          <form id="review-form" className="auth-card" onSubmit={handleSubmitReview} style={{ marginTop: 20, maxWidth: 560 }}>
            <h3 style={{ marginBottom: 8 }}>{reviewFormTitle}</h3>
            {editingId && (
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                {t('product.editsQueued')}
              </p>
            )}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setReviewRating(s)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 24,
                    cursor: 'pointer',
                    color: s <= reviewRating ? '#f5a623' : 'var(--border)',
                    padding: 0,
                  }}
                  aria-label={t('product.stars', { n: s })}
                >
                  ★
                </button>
              ))}
            </div>
            {!user && !editingId && (
              <div className="form-group">
                <label>{t('product.yourName')}</label>
                <input
                  type="text"
                  placeholder={t('product.enterName')}
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                />
              </div>
            )}
            <div className="form-group">
              <label>{t('product.yourReview')}</label>
              <textarea
                rows="3"
                placeholder={t('product.reviewPlaceholder')}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                maxLength={1000}
              />
            </div>
            <div className="form-group">
              <label>{t('product.photos')}</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setReviewImages([...e.target.files].slice(0, 5))}
              />
              {reviewImages.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {reviewImages.map((f, i) => (
                    <img
                      key={i}
                      src={URL.createObjectURL(f)}
                      alt="preview"
                      style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn btn-primary" type="submit" disabled={submittingReview}>
                {submittingReview ? t('product.submitting') : editingId ? t('product.saveChanges') : t('product.submitReview')}
              </button>
              {editingId && (
                <button type="button" className="btn" onClick={cancelEditReview}>
                  {t('common.cancel')}
                </button>
              )}
            </div>
          </form>
        )}

        {reviews.length > 0 && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 760 }}>
            {reviews.map((r) => (
              <div
                key={r.id}
                style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 16, background: 'var(--card)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 14 }}>
                    {r.name}{' '}
                    {r.verified && (
                      <span
                        title={t('product.verifiedTitle')}
                        style={{
                          display: 'inline-block',
                          fontSize: 11,
                          fontWeight: 600,
                          background: '#dcfce7',
                          color: '#166534',
                          padding: '1px 8px',
                          borderRadius: 999,
                          marginLeft: 6,
                        }}
                      >
                        ✓ {t('product.verifiedPurchase')}
                      </span>
                    )}
                    {r.featured && (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 11,
                          fontWeight: 600,
                          background: '#fef9c3',
                          color: '#854d0e',
                          padding: '1px 8px',
                          borderRadius: 999,
                          marginLeft: 6,
                        }}
                      >
                        {t('product.featuredBadge')}
                      </span>
                    )}
                    {r.pendingApproval && (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 11,
                          fontWeight: 600,
                          background: '#fef3c7',
                          color: '#92400e',
                          padding: '1px 8px',
                          borderRadius: 999,
                          marginLeft: 6,
                        }}
                      >
                        {t('product.pendingApproval')}
                      </span>
                    )}
                  </strong>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                    </span>
                    {r.isOwn && (
                      <span style={{ display: 'flex', gap: 6 }}>
                        <button className="btn" style={{ padding: '2px 10px', fontSize: 12 }} onClick={() => startEditReview(r)}>
                          {t('common.edit')}
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '2px 10px', fontSize: 12 }}
                          onClick={() => handleDeleteReview(r)}
                        >
                          {t('common.delete')}
                        </button>
                      </span>
                    )}
                  </span>
                </div>
                <div style={{ color: '#f5a623', fontSize: 13, letterSpacing: 2, marginBottom: 6 }}>
                  {'★'.repeat(Math.max(1, Math.min(5, Math.round(r.rating))))}
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{r.comment}</p>
                {Array.isArray(r.images) && r.images.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {r.images.map((img, i) => (
                      <a key={i} href={resolveImage(img)} target="_blank" rel="noreferrer">
                        <img
                          src={resolveImage(img)}
                          alt={t('product.reviewPhoto', { n: i + 1 })}
                          style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }}
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section style={{ marginTop: 56 }}>
          <div className="section-title">
            <h2>{t('product.youMayAlsoLike')}</h2>
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
