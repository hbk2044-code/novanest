import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'

export default function ResetPasswordPage() {
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
      return setError('Please enter the reset code')
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters')
    }
    if (password !== confirm) {
      return setError('Passwords do not match')
    }
    setLoading(true)
    try {
      await api.post(
        '/auth/reset-password',
        { token: token.trim(), newPassword: password },
        { auth: false }
      )
      setDone(true)
      toast.success('Password reset successful!')
    } catch (err) {
      setError(err.message || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Password Reset ✅</h1>
          <p className="sub">
            Your password has been updated successfully. You can now login with your
            new password.
          </p>
          <Link to="/login" className="btn btn-primary btn-block btn-lg">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Reset Password</h1>
        <p className="sub">Enter your reset code and choose a new password.</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Reset Code *</label>
            <input
              placeholder="Paste your reset code here"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>New Password *</label>
              <input
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm Password *</label>
              <input
                type="password"
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
          </div>
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-switch">
          Need a new code? <Link to="/forgot-password">Request again</Link>
        </div>
      </div>
    </div>
  )
}
