import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { useLang } from '../context/LanguageContext.jsx'
import { useToast } from '../components/Toast.jsx'

export default function ResetPasswordPage() {
  const { t } = useLang()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const initialToken = params.get('token') || ''
  const [token, setToken] = useState(initialToken)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!token.trim()) {
      return setError(t('auth.enterCode'))
    }
    if (password.length < 6) {
      return setError(t('auth.passwordTooShort'))
    }
    if (password !== confirm) {
      return setError(t('auth.passwordsMismatch'))
    }
    setLoading(true)
    try {
      await api.post(
        '/auth/reset-password',
        { token: token.trim(), newPassword: password },
        { auth: false }
      )
      setDone(true)
      toast.success(t('auth.resetSuccessful'))
    } catch (err) {
      setError(err.message || t('auth.resetFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>{t('auth.resetDone')}</h1>
          <p className="sub">
            {t('auth.resetDoneSub')}
          </p>
          <Link to="/login" className="btn btn-primary btn-block btn-lg">
            {t('auth.goToLogin')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{t('auth.resetTitle')}</h1>
        <p className="sub">{t('auth.resetSub')}</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('auth.resetCode')} *</label>
            <input
              placeholder={t('auth.resetCodePlaceholder')}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>{t('auth.newPassword')} *</label>
              <input
                type="password"
                placeholder={t('auth.passwordMin')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>{t('auth.confirmPassword')} *</label>
              <input
                type="password"
                placeholder={t('auth.repeatPassword')}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
          </div>
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
            {loading ? t('auth.resetting') : t('auth.updatePassword')}
          </button>
        </form>

        <div className="auth-switch">
          {t('auth.needNewCode')} <Link to="/forgot-password">{t('auth.requestAgain')}</Link>
        </div>
      </div>
    </div>
  )
}
