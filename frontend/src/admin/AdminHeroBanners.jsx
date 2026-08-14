import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'

const FONTS = [
  'Plus Jakarta Sans',
  'Georgia, serif',
  'Times New Roman, serif',
  'Courier New, monospace',
  'Arial, sans-serif',
  'Trebuchet MS, sans-serif',
  'Palatino Linotype, serif',
]

const DEFAULT_BANNER = {
  badge: '',
  title: '',
  titleHighlight: '',
  subtitle: '',
  buttonText: 'Shop Now',
  buttonLink: '/shop',
  buttonColor: '#f59e0b',
  bgType: 'gradient',
  bgColor1: '#5b21b6',
  bgColor2: '#a855f7',
  textColor: '#ffffff',
  fontFamily: 'Plus Jakarta Sans',
  fontSize: 'large',
  align: 'left',
  image: '',
  icon: '🛍️',
  active: true,
}

export default function AdminHeroBanners() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(DEFAULT_BANNER)
  const [confirmDel, setConfirmDel] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const toast = useToast()

  const load = () => {
    api.get('/admin/settings/hero-banners')
      .then((d) => setBanners(d.banners))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: val }))
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ ...DEFAULT_BANNER, sortOrder: banners.length + 1 })
    setModal(true)
  }

  const openEdit = (b) => {
    setEditing(b)
    setForm({ ...DEFAULT_BANNER, ...b })
    setModal(true)
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file')
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB')
    setUploading(true)
    try {
      const url = await api.uploadImage(file, 'banners')
      setForm((f) => ({ ...f, image: url }))
      toast.success('Image uploaded')
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const clearImage = () => {
    setForm((f) => ({ ...f, image: '' }))
    if (fileRef.current) fileRef.current.value = ''
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.title.trim() && !form.titleHighlight.trim()) {
      return toast.error('Add a title or highlight text')
    }
    try {
      const payload = { ...form }
      if (payload.image) delete payload.sortOrder
      if (editing) {
        await api.put(`/admin/settings/hero-banners/${editing.id}`, payload)
        toast.success('Banner updated')
      } else {
        await api.post('/admin/settings/hero-banners', { ...payload, sortOrder: banners.length + 1 })
        toast.success('Banner created')
      }
      setModal(false)
      load()
    } catch (err) {
      toast.error(err.message || 'Save failed')
    }
  }

  const remove = async () => {
    try {
      await api.del(`/admin/settings/hero-banners/${confirmDel.id}`)
      toast.success('Banner deleted')
      setConfirmDel(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    }
  }

  const toggleActive = async (b) => {
    try {
      await api.put(`/admin/settings/hero-banners/${b.id}`, { active: !b.active })
      load()
    } catch (err) {
      toast.error(err.message || 'Update failed')
    }
  }

  const move = async (b, dir) => {
    const sorted = banners.slice().sort((a, c) => a.sortOrder - c.sortOrder)
    const i = sorted.findIndex((x) => x.id === b.id)
    const j = i + dir
    if (j < 0 || j >= sorted.length) return
    ;[sorted[i], sorted[j]] = [sorted[j], sorted[i]]
    try {
      await api.post('/admin/settings/hero-banners/reorder', { order: sorted.map((x) => x.id) })
      load()
    } catch (err) {
      toast.error(err.message || 'Reorder failed')
    }
  }

  const previewStyle = () => {
    if (form.bgType === 'image' && form.image) {
      return { backgroundImage: `url(${form.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    }
    if (form.bgType === 'solid') return { background: form.bgColor1 }
    return { background: `linear-gradient(120deg, ${form.bgColor1}, ${form.bgColor2})` }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div>
      <div className="section-title">
        <h2>Hero Banners ({banners.filter((b) => b.active).length} active)</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Banner</button>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20, maxWidth: 720 }}>
        These banners rotate as a slider on the homepage. For each slide you can edit the
        badge, title, <strong>highlighted text</strong>, subtitle, button, background
        (gradient/solid/image), font, size, alignment and text color. Drag order via the arrows.
      </p>

      {banners.length === 0 && (
        <div className="empty-state">
          <div className="big-icon">🖼️</div>
          <h3>No banners yet</h3>
          <p>Add your first hero banner to get started.</p>
        </div>
      )}

      {banners.map((b) => (
        <div key={b.id} className="banner-card" style={{ opacity: b.active ? 1 : 0.55 }}>
          <div
            className="banner-thumb"
            style={{
              background:
                b.bgType === 'image' && b.image
                  ? `url(${b.image}) center/cover`
                  : b.bgType === 'solid'
                  ? b.bgColor1
                  : `linear-gradient(120deg, ${b.bgColor1}, ${b.bgColor2})`,
            }}
          >
            <div style={{ color: b.textColor, padding: 14, textAlign: b.align }}>
              {b.badge && <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.9, marginBottom: 4 }}>{b.badge}</div>}
              <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>
                {b.title} <span style={{ color: b.buttonColor, textDecoration: 'underline' }}>{b.titleHighlight}</span>
              </div>
              {b.subtitle && <div style={{ fontSize: 10, opacity: 0.9, marginTop: 4 }}>{b.subtitle}</div>}
              <span
                style={{
                  display: 'inline-block', marginTop: 8, background: b.buttonColor, color: '#fff',
                  fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 8,
                }}
              >
                {b.buttonText || 'Shop Now'}
              </span>
            </div>
          </div>

          <div className="banner-meta">
            <div>
              <strong>{b.title || '(no title)'} {b.titleHighlight}</strong>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Font: {b.fontFamily.split(',')[0]} · {b.fontSize} · {b.align}
                {b.bgType === 'image' && b.image ? ' · image bg' : b.bgType === 'solid' ? ' · solid bg' : ' · gradient bg'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-outline btn-sm" onClick={() => move(b, -1)} title="Move up">↑</button>
              <button className="btn btn-outline btn-sm" onClick={() => move(b, 1)} title="Move down">↓</button>
              <button
                className={`btn btn-sm ${b.active ? 'btn-success' : 'btn-outline'}`}
                onClick={() => toggleActive(b)}
                title={b.active ? 'Click to hide' : 'Click to show'}
              >
                {b.active ? 'Active' : 'Hidden'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => openEdit(b)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(b)}>Delete</button>
            </div>
          </div>
        </div>
      ))}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? `Edit Banner #${editing.id}` : 'Add Banner'}</h2>

            <div
              className="hero"
              style={{ ...previewStyle(), padding: '28px 28px', margin: '0 0 18px', borderRadius: 16, textAlign: form.align, display: 'block', position: 'relative' }}
            >
              <div style={{ color: form.textColor }}>
                {form.badge && (
                  <div className="hero-badge" style={{ background: 'rgba(255,255,255,0.18)' }}>{form.badge}</div>
                )}
                <div style={{ fontFamily: form.fontFamily, fontSize: 26, fontWeight: 800, lineHeight: 1.2, marginBottom: 8 }}>
                  {form.title} <span style={{ color: form.buttonColor, textDecoration: 'underline' }}>{form.titleHighlight}</span>
                </div>
                {form.subtitle && (
                  <div style={{ fontFamily: form.fontFamily, fontSize: 13, opacity: 0.92, maxWidth: 420, marginBottom: 12 }}>{form.subtitle}</div>
                )}
                <span
                  className="btn btn-sm"
                  style={{ background: form.buttonColor, color: '#fff', fontWeight: 700, display: 'inline-flex' }}
                >
                  {form.buttonText || 'Shop Now'}
                </span>
              </div>
            </div>

            <form onSubmit={save}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Badge (small label)</label>
                  <input value={form.badge} onChange={set('badge')} placeholder="e.g. 🚀 Marketplace" />
                </div>
                <div className="form-group">
                  <label>Icon (emoji)</label>
                  <input value={form.icon} onChange={set('icon')} placeholder="🛍️" />
                </div>
              </div>
              <div className="form-group">
                <label>Title (first part)</label>
                <input value={form.title} onChange={set('title')} placeholder="e.g. Everything Nepal Needs," />
              </div>
              <div className="form-group">
                <label>Highlighted Text (styled part)</label>
                <input value={form.titleHighlight} onChange={set('titleHighlight')} placeholder="e.g. One Nest." />
              </div>
              <div className="form-group">
                <label>Subtitle</label>
                <textarea rows="2" value={form.subtitle} onChange={set('subtitle')} placeholder="Short supporting line..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Button Text</label>
                  <input value={form.buttonText} onChange={set('buttonText')} placeholder="Shop Now" />
                </div>
                <div className="form-group">
                  <label>Button Link</label>
                  <input value={form.buttonLink} onChange={set('buttonLink')} placeholder="/shop" />
                </div>
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 800, margin: '14px 0 10px' }}>Background & Colors</h3>
              <div className="form-group">
                <label>Background Type</label>
                <select value={form.bgType} onChange={set('bgType')}>
                  <option value="gradient">Gradient</option>
                  <option value="solid">Solid Color</option>
                  <option value="image">Image</option>
                </select>
              </div>
              {form.bgType === 'image' ? (
                <div className="form-group">
                  <label>Background Image</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} disabled={uploading} style={{ padding: 6 }} />
                    {form.image && <button type="button" className="btn btn-danger btn-sm" onClick={clearImage}>Remove</button>}
                  </div>
                  {uploading && <p style={{ fontSize: 12, color: 'var(--primary)' }}>Uploading...</p>}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Color 1</label>
                    <input type="color" value={form.bgColor1} onChange={set('bgColor1')} style={{ padding: 4, height: 44 }} />
                  </div>
                  {form.bgType === 'gradient' && (
                    <div className="form-group">
                      <label>Color 2</label>
                      <input type="color" value={form.bgColor2} onChange={set('bgColor2')} style={{ padding: 4, height: 44 }} />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Text Color</label>
                    <input type="color" value={form.textColor} onChange={set('textColor')} style={{ padding: 4, height: 44 }} />
                  </div>
                  <div className="form-group">
                    <label>Button Color</label>
                    <input type="color" value={form.buttonColor} onChange={set('buttonColor')} style={{ padding: 4, height: 44 }} />
                  </div>
                </div>
              )}

              <h3 style={{ fontSize: 14, fontWeight: 800, margin: '14px 0 10px' }}>Typography & Layout</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Font Family</label>
                  <select value={form.fontFamily} onChange={set('fontFamily')}>
                    {FONTS.map((f) => <option key={f} value={f}>{f.split(',')[0]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Text Size</label>
                  <select value={form.fontSize} onChange={set('fontSize')}>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="xlarge">Extra Large</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Alignment</label>
                  <select value={form.align} onChange={set('align')}>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 20px' }}>
                <input type="checkbox" checked={form.active} onChange={set('active')} style={{ width: 18, height: 18 }} />
                <span style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Active (shown on homepage slider)</span>
              </label>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update Banner' : 'Create Banner'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Banner</h2>
            <p>Are you sure you want to delete this banner slide?</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setConfirmDel(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={remove}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
