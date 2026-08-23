import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import { useBranding } from '../context/BrandingContext.jsx'
import BrandLogo from '../components/BrandLogo.jsx'

const EMPTY = {
  appName: 'NovaNest',
  tagline: '',
  logo: '',
  icon: '🛍️',
}

export default function AdminBranding() {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const toast = useToast()
  const { reload } = useBranding()

  useEffect(() => {
    api.get('/admin/settings/branding')
      .then((d) => setForm({ ...EMPTY, ...(d.branding || {}) }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file')
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB')
    setUploading(true)
    try {
      const url = await api.uploadImage(file, 'logo')
      setForm((f) => ({ ...f, logo: url }))
      toast.success('Logo uploaded')
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removeLogo = () => {
    setForm((f) => ({ ...f, logo: '' }))
    if (fileRef.current) fileRef.current.value = ''
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.appName.trim()) return toast.error('App name is required')
    setSaving(true)
    try {
      await api.put('/admin/settings/branding', form)
      toast.success('Logo & name updated. The storefront now uses the new branding.')
      reload()
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading...</div>
  }

  return (
    <div>
      <div className="section-title">
        <h2>Logo &amp; Name</h2>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20, maxWidth: 720 }}>
        Change how your web app is branded. The <strong>app name</strong> and{' '}
        <strong>logo</strong> appear in the storefront header, footer, browser tab title,
        favicon and invoices.
      </p>

      <div className="banner-card" style={{ marginBottom: 18, alignItems: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>
          <BrandLogo />
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Live preview of the storefront logo</div>
      </div>

      <form className="auth-card" onSubmit={save}>
        <h1>Branding</h1>

        <div className="form-group">
          <label>App Name</label>
          <input
            type="text"
            value={form.appName}
            onChange={set('appName')}
            placeholder="e.g. NovaNest"
            maxLength={40}
          />
        </div>
        <div className="form-group">
          <label>Tagline</label>
          <input
            type="text"
            value={form.tagline}
            onChange={set('tagline')}
            placeholder="e.g. Everything Nepal Needs, One Nest."
            maxLength={80}
          />
        </div>
        <div className="form-group">
          <label>Logo</label>
          <p className="sub" style={{ marginBottom: 8 }}>
            Upload a logo image (JPG/PNG/WebP/GIF, max 5MB). If no logo is uploaded, the emoji below is used.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              disabled={uploading}
              style={{ padding: 6 }}
            />
            {form.logo && (
              <>
                <img
                  src={form.logo}
                  alt="logo preview"
                  style={{ height: 40, width: 40, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)', background: '#fff' }}
                />
                <button type="button" className="btn btn-danger btn-sm" onClick={removeLogo}>
                  Remove Logo
                </button>
              </>
            )}
            {uploading && <p style={{ fontSize: 12, color: 'var(--primary)', margin: 0 }}>Uploading...</p>}
          </div>
        </div>
        <div className="form-group">
          <label>Icon (emoji, used when no logo is set)</label>
          <input type="text" value={form.icon} onChange={set('icon')} placeholder="🛍️" maxLength={8} />
        </div>

        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Branding'}
        </button>
      </form>
    </div>
  )
}
