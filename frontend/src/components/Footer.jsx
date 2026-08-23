import { Link } from 'react-router-dom'
import BrandLogo from './BrandLogo.jsx'
import { useLang } from '../context/LanguageContext.jsx'

export default function Footer() {
  const { t } = useLang()
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <div className="footer-logo">
            <BrandLogo inverted />
          </div>
          <p style={{ fontSize: 14, maxWidth: 320 }}>
            {t('footer.tagline')}
          </p>
        </div>
        <div>
          <h4>{t('nav.shop')}</h4>
          <Link to="/shop">{t('footer.allProducts')}</Link>
          <Link to="/shop?category=food">Food</Link>
          <Link to="/shop?category=groceries">Groceries</Link>
          <Link to="/shop?category=used-electronics">Used Electronics</Link>
        </div>
        <div>
          <h4>{t('footer.account')}</h4>
          <Link to="/login">{t('auth.login')}</Link>
          <Link to="/signup">{t('auth.signup')}</Link>
          <Link to="/cart">{t('header.cart')}</Link>
          <Link to="/orders">{t('nav.orders')}</Link>
        </div>
        <div>
          <h4>{t('footer.contactUs')}</h4>
          <p style={{ fontSize: 14 }}>Kathmandu, Nepal</p>
          <p style={{ fontSize: 14 }}>+977-980-000-0000</p>
          <p style={{ fontSize: 14 }}>support@novanest.com</p>
        </div>
      </div>
    </footer>
  )
}
