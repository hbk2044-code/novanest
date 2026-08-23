import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'

const EMPTY = {
  esewa: { enabled: true, testMode: true, productCode: '', secretKey: '' },
  khalti: { enabled: true, testMode: true, secretKey: '' },
}

const TEST_HINTS = [
  { name: 'eSewa', creds: 'IDs 9711111111–9711111114 · Password Nepal@123 · OTP 123456' },
  { name: 'Khalti', creds: 'IDs 9800000000–9800000005 · MPIN 1111 · OTP 987654' },
]

export default function AdminPayments() {
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reveal, setReveal] = useState({ esewa: false, khalti: false })
  const toast = useToast()

  useEffect(() => {
    api.get('/admin/settings/payments')
      .then((d) => {
        setForm({ ...EMPTY, ...d.payments })
        setStatus(d.status || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (provider, k) => (e) =>
    setForm((f) => ({ ...f, [provider]: { ...f[provider], [k]: e.target.value } }))

  const toggle = (provider, k) =>
    setForm((f) => ({ ...f, [provider]: { ...f[provider], [k]: !f[provider][k] } }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const d = await api.put('/admin/settings/payments', form)
      setForm({ ...EMPTY, ...d.payments })
      setStatus(d.status || null)
      toast.success('Payment gateway settings saved')
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const switchRow = (provider, k, label, note) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
      <label className="switch">
        <input type="checkbox" checked={Boolean(form[provider][k])} onChange={() => toggle(provider, k)} />
        <span className="slider" />
      </label>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        {note && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{note}</div>}
      </div>
    </div>
  )

  const secretField = (provider) => {
    const show = reveal[provider]
    return (
      <div className="form-group">
        <label>Secret Key</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type={show ? 'text' : 'password'}
            autoComplete="off"
            placeholder="Paste your merchant secret key"
            value={form[provider].secretKey || ''}
            onChange={set(provider, 'secretKey')}
            style={{ flex: 1 }}
          />
          <button type="button" className="btn btn-outline" onClick={() => setReveal((r) => ({ ...r, [provider]: !show }))}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading...</div>
  }

  const misconfigWarning = (provider) => {
    if (!status || !status[provider]?.misconfigured) return null
    const label = provider === 'esewa' ? 'eSewa' : 'Khalti'
    return (
      <div style={{
        background: 'var(--danger)',
        color: '#fff',
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.5,
        margin: '6px 0 12px',
      }}>
        {label} is in LIVE mode but still uses test credentials. Real payments are blocked until you
        enter the live Product Code {provider === 'esewa' ? 'and Secret Key' : 'Secret Key'} above and
        disable test mode.
      </div>
    )
  }

  const esewaUrls = form.esewa.testMode
    ? ['https://rc-epay.esewa.com.np/api/epay/main/v2/form', 'https://rc.esewa.com.np/api/epay/transaction/status/']
    : ['https://epay.esewa.com.np/api/epay/main/v2/form', 'https://esewa.com.np/api/epay/transaction/status/']
  const khaltiUrls = form.khalti.testMode
    ? ['https://dev.khalti.com/api/v2/', 'https://test-pay.khalti.com/']
    : ['https://khalti.com/api/v2/', 'https://pay.khalti.com/']

  return (
    <div>
      <div className="section-title">
        <h2>Payment Gateways</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
          Configure eSewa and Khalti for your store. Changes apply immediately — no restart needed.
        </p>
      </div>

      <form className="auth-card" onSubmit={save}>
        <h1>eSewa</h1>
        <p className="sub">Wallet payments from eSewa users. Product code &amp; secret come from your eSewa merchant account.</p>

        {switchRow('esewa', 'enabled', 'Accept eSewa payments', 'Shows eSewa as a payment method at checkout.')}
        {switchRow('esewa', 'testMode', 'Test (sandbox) mode',
          form.esewa.testMode ? 'Sandbox is active — no real money moves. Switch off to go live.' : 'LIVE mode is active — real payments!')}
        {misconfigWarning('esewa')}

        <div className="form-group">
          <label>Product Code</label>
          <input type="text" placeholder="e.g. EPAYTEST" value={form.esewa.productCode || ''} onChange={set('esewa', 'productCode')} />
        </div>
        {secretField('esewa')}

        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, lineHeight: 1.7 }}>
          <strong>Active endpoints:</strong><br />
          Payment form: {esewaUrls[0]}<br />
          Status check: {esewaUrls[1]}
        </div>

        <h1 style={{ marginTop: 24 }}>Khalti</h1>
        <p className="sub">Wallet, e-banking and card payments. The secret key comes from your Khalti merchant dashboard.</p>

        {switchRow('khalti', 'enabled', 'Accept Khalti payments', 'Shows Khalti as a payment method at checkout.')}
        {switchRow('khalti', 'testMode', 'Test (sandbox) mode',
          form.khalti.testMode ? 'Sandbox is active — no real money moves. Switch off to go live.' : 'LIVE mode is active — real payments!')}
        {misconfigWarning('khalti')}

        {secretField('khalti')}

        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, lineHeight: 1.7 }}>
          <strong>Active endpoints:</strong><br />
          API base: {khaltiUrls[0]}<br />
          Payment page: {khaltiUrls[1]}
        </div>

        <div className="error-banner" style={{ marginTop: 20 }}>
          <strong>Test credentials</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {TEST_HINTS.map((t) => (
              <li key={t.name}>{t.name}: {t.creds}</li>
            ))}
          </ul>
        </div>

        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Payment Settings'}
        </button>
      </form>
    </div>
  )
}
