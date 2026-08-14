import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import ProductCard from '../components/ProductCard.jsx'
import HeroSlider from '../components/HeroSlider.jsx'

export default function Home() {
  const [categories, setCategories] = useState([])
  const [featured, setFeatured] = useState([])
  const [deals, setDeals] = useState([])
  const [banners, setBanners] = useState([])

  useEffect(() => {
    api.get('/categories').then((d) => setCategories(d.categories)).catch(() => {})
    api.get('/products?featured=true&limit=8').then((d) => setFeatured(d.products)).catch(() => {})
    api.get('/products?sort=price_desc&limit=4').then((d) => setDeals(d.products)).catch(() => {})
    api.get('/settings/hero-banners', { auth: false }).then((d) => setBanners(d.banners)).catch(() => {})
  }, [])

  return (
    <div>
      <HeroSlider banners={banners} />

      <section style={{ marginBottom: 48 }}>
        <div className="section-title">
          <h2>Shop by Category</h2>
          <Link to="/shop" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 14 }}>
            View all →
          </Link>
        </div>
        <div className="cat-grid">
          {categories.map((c) => (
            <Link key={c.id} to={`/shop?category=${c.slug}`} className="cat-card">
              <div className="cat-icon">{c.icon}</div>
              <h3>{c.name}</h3>
              <p>{c.productCount} items</p>
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 48 }}>
        <div className="section-title">
          <h2>Featured Products</h2>
          <Link to="/shop" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 14 }}>
            See more →
          </Link>
        </div>
        <div className="product-grid">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 48 }}>
        <div className="section-title">
          <h2>Hot Deals & Best Sellers</h2>
          <Link to="/shop?sort=rating" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 14 }}>
            Top rated →
          </Link>
        </div>
        <div className="product-grid">
          {deals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section
        style={{
          background: 'linear-gradient(135deg, #fef3c7, #fed7aa)',
          borderRadius: 24,
          padding: '40px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800 }}>Free delivery on orders over Rs. 2,000</h2>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>
            Plus COD available all over Nepal. Your satisfaction is our nest.
          </p>
        </div>
        <Link to="/shop" className="btn btn-primary btn-lg">Start Shopping</Link>
      </section>
    </div>
  )
}
