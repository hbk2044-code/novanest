import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'

export default function LoginPage() {
  const { login } = useAuth()
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
      toast.success(`Welcome back, ${user.name}!`)
      const from = location.state?.from
      navigate(from || (user.role === 'admin' ? '/admin' : '/'), { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setEmail('demo@novanest.com')
    setPassword('demo123')
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Welcome Back 👋</h1>
        <p className="sub">Login to continue shopping at NovaNest.</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
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
              Forgot password?
            </Link>
          </div>
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={fillDemo} type="button">
            Use Demo Account
          </button>
        </div>

        <div className="auth-switch">
          New to NovaNest? <Link to="/signup">Create an account</Link>
        </div>
      </div>
    </div>
  )
}
