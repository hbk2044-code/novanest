import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useLang } from '../context/LanguageContext.jsx'
import { useToast } from '../components/Toast.jsx'

export default function ForgotPasswordPage() {
  const { t } = useLang()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.post('/auth/forgot-password', { email }, { auth: false })
      setResult(data)
      toast.success(t('auth.resetSent'))
    } catch (err) {
      setError(err.message || t('auth.requestFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{t('auth.forgotQ')}</h1>
        <p className="sub">{t('auth.forgotSub2')}</p>

        {error && <div className="error-banner">{error}</div>}

        {!result ? (
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
            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
              {loading ? t('auth.sending') : t('auth.sendLink')}
            </button>
          </form>
        ) : (
          <div>
            <div className="success-banner">
              {t('auth.sentSuccess')}
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
              {t('auth.devNote')}
            </p>
            <Link to="/login" className="btn btn-outline btn-block btn-lg" style={{ marginTop: 16 }}>
              {t('auth.backToLogin')}
            </Link>
          </div>
        )}

        <div className="auth-switch">
          {t('auth.remembered')} <Link to="/login">{t('auth.backToLogin')}</Link>
        </div>
      </div>
    </div>
  )
}
