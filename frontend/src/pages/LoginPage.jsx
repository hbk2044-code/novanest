import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useLang } from '../context/LanguageContext.jsx'
import { useToast } from '../components/Toast.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const { t } = useLang()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      toast.success(t('auth.welcomeBack', { name: user.name }))
      const from = location.state?.from
      navigate(from || (user.role === 'admin' ? '/admin' : '/'), { replace: true })
    } catch (err) {
      setError(err.message || t('auth.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{t('auth.welcomeTitle')}</h1>
        <p className="sub">{t('auth.loginSub2')}</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('auth.email')}</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('auth.password')}</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div style={{ textAlign: 'right', marginTop: -4, marginBottom: 14 }}>
            <Link to="/forgot-password" style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600 }}>
              {t('auth.forgotLink')}
            </Link>
          </div>
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
            {loading ? t('auth.loggingIn') : t('auth.loginBtn')}
          </button>
        </form>

        <div className="auth-switch">
          {t('auth.newHere')} <Link to="/signup">{t('auth.createAccount')}</Link>
        </div>
      </div>
    </div>
  )
}
