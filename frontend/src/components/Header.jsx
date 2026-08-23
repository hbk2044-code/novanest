import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useBranding } from '../context/BrandingContext.jsx'
import { useLang, LANGUAGES } from '../context/LanguageContext.jsx'
import { useToast } from './Toast.jsx'
import { api } from '../api.js'
import BrandLogo from './BrandLogo.jsx'

export default function Header() {
  const { user, logout } = useAuth()
  const { cart, clearCart } = useCart()
  const { branding } = useBranding()
  const { t, lang, setLang } = useLang()
  const toast = useToast()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const [pwOpen, setPwOpen] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/')
  }

  const handleClearCart = async () => {
    if (!window.confirm(t('header.clearCart'))) return
    try {
      await clearCart()
      toast.success(t('header.cartCleared'))
    } catch (err) {
      toast.error(err.message || t('header.clearFailed'))
    }
  }

  const openPassword = () => {
    setMenuOpen(false)
    setPwForm({ current: '', next: '', confirm: '' })
    setPwOpen(true)
  }

  const submitPassword = async (e) => {
    e.preventDefault()
    if (pwForm.next.length < 6) {
      return toast.error(t('header.passwordTooShort'))
    }
    if (pwForm.next !== pwForm.confirm) {
      return toast.error(t('header.passwordsMismatch'))
    }
    setPwSaving(true)
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
      })
      toast.success(t('header.passwordChanged'))
      setPwOpen(false)
    } catch (err) {
      toast.error(err.message || t('header.changeFailed'))
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          <BrandLogo />
        </Link>

        <nav className="nav">
          <NavLink to="/" end>{t('nav.home')}</NavLink>
          <NavLink to="/shop">{t('nav.shop')}</NavLink>
          {user && <NavLink to="/orders">{t('nav.orders')}</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin">{t('nav.admin')}</NavLink>}
        </nav>

        <div className="header-actions">
          <div className="lang-switch" title={t('lang.name')}>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                className={lang === l.code ? 'active' : ''}
                onClick={() => setLang(l.code)}
                aria-label={l.name}
              >
                {l.short}
              </button>
            ))}
          </div>
          <Link to="/cart" className="icon-btn" title={t('header.cart')}>
            🛒
            {cart.count > 0 && <span className="badge">{cart.count}</span>}
          </Link>
          {cart.count > 0 && (
            <button
              className="btn btn-outline btn-sm"
              onClick={handleClearCart}
              title={t('header.clear')}
            >
              {t('header.clear')}
            </button>
          )}

          {user ? (
            <div style={{ position: 'relative' }} ref={menuRef}>
              <button
                className="avatar"
                onClick={() => setMenuOpen((v) => !v)}
                title={user.name}
              >
                {user.name.charAt(0).toUpperCase()}
              </button>
              {menuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 52,
                    background: '#fff',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    boxShadow: 'var(--shadow-lg)',
                    padding: '8px',
                    width: 220,
                    zIndex: 120,
                  }}
                >
                  <div style={{ padding: '8px 12px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{user.email}</div>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '6px 0' }} />
                  <Link
                    to="/orders"
                    onClick={() => setMenuOpen(false)}
                    style={{ display: 'block', padding: '9px 12px', borderRadius: 8, fontSize: 14, fontWeight: 600 }}
                  >
                    {t('nav.orders')}
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      style={{ display: 'block', padding: '9px 12px', borderRadius: 8, fontSize: 14, fontWeight: 600 }}
                    >
                      {t('header.adminDashboard')}
                    </Link>
                  )}
                  <button
                    onClick={openPassword}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 12px',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'inherit',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {t('header.changePassword')}
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 12px',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--danger)',
                    }}
                  >
                    {t('header.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              {t('header.login')}
            </Link>
          )}
        </div>
      </div>

      {pwOpen && (
        <div className="modal-overlay" onClick={() => setPwOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('header.changePasswordTitle')}</h2>
            <p className="sub" style={{ marginTop: 4 }}>{t('header.changePasswordSub')}</p>
            <form onSubmit={submitPassword}>
              <div className="form-group">
                <label>{t('header.currentPassword')}</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={pwForm.current}
                  onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('header.newPassword')}</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('header.passwordHint')}
                  value={pwForm.next}
                  onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('header.confirmPassword')}</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setPwOpen(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                  {pwSaving ? t('common.saving') : t('common.update')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  )
}
