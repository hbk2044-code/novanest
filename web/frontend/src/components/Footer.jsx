import { Link } from 'react-router-dom'
import BrandLogo from './BrandLogo.jsx'
import { useLang } from '../context/LanguageContext.jsx'
import { useBranding } from '../context/BrandingContext.jsx'
import { SOCIAL_LINKS, FacebookIcon, InstagramIcon, WhatsAppIcon } from './SocialLinks.jsx'

const SOCIAL_ITEMS = [
  { key: 'facebook', label: 'Facebook', href: SOCIAL_LINKS.facebook, Icon: FacebookIcon, color: '#1877F2' },
  { key: 'instagram', label: 'Instagram', href: SOCIAL_LINKS.instagram, Icon: InstagramIcon, color: '#E4405F' },
  { key: 'whatsapp', label: 'WhatsApp', href: SOCIAL_LINKS.whatsapp, Icon: WhatsAppIcon, color: '#25D366' },
]

export default function Footer() {
  const { t } = useLang()
  const { branding } = useBranding()
  const year = new Date().getFullYear()
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
          <h4 style={{ marginTop: 16 }}>{t('footer.follow')}</h4>
          <div className="footer-social">
            {SOCIAL_ITEMS.map(({ key, label, href, Icon, color }) => (
              <a key={key} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
                <span style={{ color }}><Icon /></span>
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <p>© {year} {branding.appName || 'NovaNest'}. {t('footer.rights')}</p>
        </div>
      </div>
    </footer>
  )
}
