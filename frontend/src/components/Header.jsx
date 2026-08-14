import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useBranding } from '../context/BrandingContext.jsx'
import BrandLogo from './BrandLogo.jsx'

export default function Header() {
  const { user, logout } = useAuth()
  const { cart } = useCart()
  const { branding } = useBranding()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

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

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          <BrandLogo />
        </Link>

        <nav className="nav">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/shop">Shop</NavLink>
          {user && <NavLink to="/orders">My Orders</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        </nav>

        <div className="header-actions">
          <Link to="/cart" className="icon-btn" title="Cart">
            🛒
            {cart.count > 0 && <span className="badge">{cart.count}</span>}
          </Link>

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
                    My Orders
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      style={{ display: 'block', padding: '9px 12px', borderRadius: 8, fontSize: 14, fontWeight: 600 }}
                    >
                      Admin Dashboard
                    </Link>
                  )}
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
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Login / Sign Up
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
