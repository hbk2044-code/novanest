import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'

const EMPTY = {
  companyName: '',
  tagline: '',
  address: '',
  phone: '',
  email: '',
  pan: '',
  bankName: '',
  bankAccount: '',
}

export default function AdminStoreSettings() {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    api.get('/admin/settings/store-info')
      .then((d) => setForm({ ...EMPTY, ...d.storeInfo }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/admin/settings/store-info', form)
      toast.success('Store / invoice settings saved')
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const field = (key, label, placeholder, type = 'text') => (
    <div className="form-group">
      <label>{label}</label>
      <input type={type} placeholder={placeholder} value={form[key] || ''} onChange={set(key)} />
    </div>
  )

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading...</div>
  }

  return (
    <div>
      <div className="section-title">
        <h2>Store & Invoice Settings</h2>
      </div>

      <form className="auth-card" onSubmit={save}>
        <h1>Company Details</h1>
        <p className="sub">These details appear on every order invoice.</p>

        {field('companyName', 'Company Name', 'e.g. NovaNest')}
        {field('tagline', 'Tagline', 'e.g. Everything Nepal Needs, One Nest.')}
        {field('address', 'Address', 'e.g. Biratnagar, Morang, Nepal')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {field('phone', 'Phone', '+977-98XXXXXXXX', 'tel')}
          {field('email', 'Email', 'support@example.com', 'email')}
        </div>
        {field('pan', 'PAN / VAT Number (optional)', 'e.g. 612345678')}
        <h1 style={{ marginTop: 16 }}>Bank Details (optional)</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {field('bankName', 'Bank Name', 'e.g. NMB Bank')}
          {field('bankAccount', 'Account Number', 'e.g. 1234567890123')}
        </div>

        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
