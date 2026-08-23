import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useLang } from '../context/LanguageContext.jsx'
import { useToast } from '../components/Toast.jsx'

export default function SignupPage() {
  const { signup } = useAuth()
  const { t } = useLang()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      return setError(t('auth.passwordsMismatch'))
    }
    if (form.password.length < 6) {
      return setError(t('auth.passwordTooShort'))
    }
    setLoading(true)
    try {
      const user = await signup({
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        password: form.password,
      })
      toast.success(t('auth.welcomeTo', { name: user.name }))
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || t('auth.signupFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{t('auth.signupTitle')} ✨</h1>
        <p className="sub">{t('auth.signupSub2')}</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('auth.fullName')} *</label>
            <input placeholder={t('auth.yourName')} value={form.name} onChange={set('name')} required />
          </div>
          <div className="form-group">
            <label>{t('auth.email')} *</label>
            <input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label>{t('auth.phone')}</label>
            <input placeholder={t('auth.phonePlaceholder')} value={form.phone} onChange={set('phone')} />
          </div>
          <div className="form-group">
            <label>{t('auth.address')}</label>
            <input placeholder={t('auth.addressPlaceholder')} value={form.address} onChange={set('address')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>{t('auth.password')} *</label>
              <input type="password" placeholder={t('auth.passwordMin')} value={form.password} onChange={set('password')} required />
            </div>
            <div className="form-group">
              <label>{t('auth.confirmPassword')} *</label>
              <input type="password" placeholder={t('auth.repeatPassword')} value={form.confirm} onChange={set('confirm')} required />
            </div>
          </div>
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
            {loading ? t('auth.creating') : t('auth.signupBtn')}
          </button>
        </form>

        <div className="auth-switch">
          {t('auth.haveAccount')} <Link to="/login">{t('auth.loginBtn')}</Link>
        </div>
      </div>
    </div>
  )
}
