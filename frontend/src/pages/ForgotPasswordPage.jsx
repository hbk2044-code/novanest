import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'

export default function ForgotPasswordPage() {
  const toast = useToast()
  const navigate = useNavigate()
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
      toast.success('Reset code generated')
    } catch (err) {
      setError(err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const goToReset = () => {
    navigate(`/reset-password?token=${result.resetToken}`)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Forgot Password?</h1>
        <p className="sub">Enter your registered email and we'll generate a password reset code.</p>

        {error && <div className="error-banner">{error}</div>}

        {!result ? (
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
            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
              {loading ? 'Generating code...' : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <div>
            <div className="success-banner">
              {result.message} — valid for {result.expiresInMinutes} minutes.
            </div>
            <div className="form-group">
              <label>Your Reset Code</label>
              <div
                style={{
                  background: 'var(--bg)',
                  border: '1px dashed var(--primary)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontFamily: 'monospace',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--primary-dark)',
                  wordBreak: 'break-all',
                }}
              >
                {result.resetToken}
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                (In production this code would be emailed to you. Save it — you'll need
                it to reset your password.)
              </p>
            </div>
            <button className="btn btn-primary btn-block btn-lg" onClick={goToReset}>
              Continue to Reset Password
            </button>
          </div>
        )}

        <div className="auth-switch">
          Remembered your password? <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  )
}
