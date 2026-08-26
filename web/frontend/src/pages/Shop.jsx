import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { useLang } from '../context/LanguageContext.jsx'
import ProductCard from '../components/ProductCard.jsx'
import useRefreshOnResume from '../hooks/useRefreshOnResume.js'

export default function Shop() {
  const { t } = useLang()
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || ''
  const search = params.get('search') || ''
  const sort = params.get('sort') || 'newest'

  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchInput, setSearchInput] = useState(search)

  useEffect(() => {
    api.get('/categories').then((d) => setCategories(d.categories)).catch(() => {})
  }, [])

  const load = useCallback(() => {
    const q = new URLSearchParams()
    if (category) q.set('category', category)
    if (search) q.set('search', search)
    if (sort) q.set('sort', sort)
    return api.get(`/products?${q.toString()}`)
      .then((d) => {
        setProducts(d.products)
        setTotal(d.total)
      })
      .catch(() => {})
  }, [category, search, sort])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const refresh = useCallback(() => {
    setRefreshing(true)
    load().finally(() => setRefreshing(false))
  }, [load])

  useRefreshOnResume(refresh)

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  const submitSearch = (e) => {
    e.preventDefault()
    updateParam('search', searchInput.trim())
  }

  return (
    <div>
      <div className="section-title">
        <h2>{category ? categories.find((c) => c.slug === category)?.name || t('shop.title') : t('shop.allProducts')}</h2>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>{t('shop.count', { n: total })}</span>
      </div>

      <div className="toolbar">
        <form className="search-box" onSubmit={submitSearch}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            placeholder={t('shop.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>
        <select
          value={sort}
          onChange={(e) => updateParam('sort', e.target.value)}
          style={{ width: 180 }}
        >
          <option value="newest">{t('shop.sortNewest')}</option>
          <option value="price_asc">{t('shop.sortPriceLow')}</option>
          <option value="price_desc">{t('shop.sortPriceHigh')}</option>
          <option value="rating">{t('shop.topRated')}</option>
        </select>
        <button
          className="btn btn-outline btn-sm"
          onClick={refresh}
          disabled={refreshing}
          title={t('shop.refresh')}
        >
          {refreshing ? t('common.saving') : '↻ ' + t('shop.refresh')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        <button
          className={`chip ${!category ? 'active' : ''}`}
          onClick={() => updateParam('category', '')}
        >
          {t('common.all')}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`chip ${category === c.slug ? 'active' : ''}`}
            onClick={() => updateParam('category', category === c.slug ? '' : c.slug)}
          >
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> {t('shop.loading')}</div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="big-icon">🔍</div>
          <h3>{t('shop.noResults')}</h3>
          <p>{t('shop.tryAgain')}</p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
