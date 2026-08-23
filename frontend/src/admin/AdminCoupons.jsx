import { useEffect, useState } from 'react'
import { api, formatDate } from '../api.js'
import { useToast } from '../components/Toast.jsx'

const EMPTY = {
  code: '',
  description: '',
  type: 'percent',
  value: '',
  minSubtotal: '',
  maxDiscount: '',
  perUserLimit: '',
  totalLimit: '',
  active: true,
  startDate: '',
  endDate: '',
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [confirmDel, setConfirmDel] = useState(null)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const load = () => {
    api.get('/admin/coupons').then((d) => setCoupons(d.coupons)).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: val }))
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setModal(true)
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({
      code: c.code,
      description: c.description || '',
      type: c.type,
      value: c.value,
      minSubtotal: c.minSubtotal ?? '',
      maxDiscount: c.maxDiscount ?? '',
      perUserLimit: c.perUserLimit || '',
      totalLimit: c.totalLimit || '',
      active: c.active !== false,
      startDate: c.startDate ? c.startDate.slice(0, 16) : '',
      endDate: c.endDate ? c.endDate.slice(0, 16) : '',
    })
    setModal(true)
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.code.trim()) return toast.error('Coupon code is required')
    if (!form.value && Number(form.value) !== 0) return toast.error('Discount value is required')
    setSaving(true)
    const payload = {
      code: form.code,
      description: form.description,
      type: form.type,
      value: form.value,
      minSubtotal: form.minSubtotal || 0,
      maxDiscount: form.maxDiscount,
      perUserLimit: form.perUserLimit || 0,
      totalLimit: form.totalLimit || 0,
      active: form.active,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
    }
    try {
      if (editing) {
        await api.put(`/admin/coupons/${editing.id}`, payload)
        toast.success('Coupon updated')
      } else {
        await api.post('/admin/coupons', payload)
        toast.success(`Coupon ${form.code.toUpperCase()} created`)
      }
      setModal(false)
      load()
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setSaving(true)
    try {
      const data = await api.del(`/admin/coupons/${confirmDel.id}`)
      toast.success(data.message || 'Coupon deleted')
      setConfirmDel(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (c) => {
    try {
      await api.put(`/admin/coupons/${c.id}`, { active: c.active !== true })
      toast.success(`${c.code} ${c.active ? 'disabled' : 'enabled'}`)
      load()
    } catch (err) {
      toast.error(err.message || 'Update failed')
    }
  }

  const valueLabel = (c) =>
    c.type === 'percent' ? `${c.value}%` : `Rs. ${Number(c.value).toLocaleString('en-IN')}`

  return (
    <div>
      <div className="section-title">
        <h2>Coupons ({coupons.length})</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Coupon</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
              <th>Discount</th>
              <th>Min Subtotal</th>
              <th>Max Discount</th>
              <th>Limits (user/total)</th>
              <th>Used</th>
              <th>Valid Until</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 800, letterSpacing: 1 }}>{c.code}</td>
                <td style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 200 }}>
                  {c.description || '—'}
                </td>
                <td style={{ fontWeight: 700 }}>{valueLabel(c)}</td>
                <td style={{ fontSize: 13 }}>{c.minSubtotal ? `Rs. ${Number(c.minSubtotal).toLocaleString('en-IN')}` : 'None'}</td>
                <td style={{ fontSize: 13 }}>
                  {c.maxDiscount ? `Rs. ${Number(c.maxDiscount).toLocaleString('en-IN')}` : 'None'}
                </td>
                <td style={{ fontSize: 13 }}>
                  {c.perUserLimit || '∞'} / {c.totalLimit || '∞'}
                </td>
                <td>{c.usedCount || 0}</td>
                <td style={{ fontSize: 13, color: 'var(--muted)' }}>{c.endDate ? formatDate(c.endDate) : 'Never'}</td>
                <td>
                  <span className={`badge badge-${c.active ? 'confirmed' : 'cancelled'}`}>
                    {c.active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(c)}>
                      {c.active ? 'Disable' : 'Enable'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(c)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? `Edit Coupon ${editing.code}` : 'Add Coupon'}</h2>
            <form onSubmit={save}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Code *</label>
                  <input value={form.code} onChange={set('code')} placeholder="e.g. FESTIVE20" style={{ textTransform: 'uppercase' }} required />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={form.type} onChange={set('type')}>
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed (Rs.)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{form.type === 'percent' ? 'Percent Off (%)' : 'Amount Off (Rs.)'} *</label>
                  <input type="number" min="0" step="0.01" value={form.value} onChange={set('value')} required />
                </div>
                <div className="form-group">
                  <label>Min Subtotal (Rs.)</label>
                  <input type="number" min="0" value={form.minSubtotal} onChange={set('minSubtotal')} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Max Discount (Rs.)</label>
                  <input type="number" min="0" value={form.maxDiscount} onChange={set('maxDiscount')} placeholder="Unlimited" />
                </div>
                <div className="form-group">
                  <label>Per-User Limit</label>
                  <input type="number" min="0" value={form.perUserLimit} onChange={set('perUserLimit')} placeholder="Unlimited" />
                </div>
                <div className="form-group">
                  <label>Total Usage Limit</label>
                  <input type="number" min="0" value={form.totalLimit} onChange={set('totalLimit')} placeholder="Unlimited" />
                </div>
                <div className="form-group">
                  <label>Starts</label>
                  <input type="datetime-local" value={form.startDate} onChange={set('startDate')} />
                </div>
                <div className="form-group">
                  <label>Expires</label>
                  <input type="datetime-local" value={form.endDate} onChange={set('endDate')} />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input value={form.description} onChange={set('description')} placeholder="e.g. 20% off your first order" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 20px' }}>
                <input type="checkbox" checked={form.active} onChange={set('active')} style={{ width: 18, height: 18 }} />
                <span style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Active</span>
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Coupon</h2>
            <p>Are you sure you want to delete <strong>{confirmDel.code}</strong>? It can no longer be used.</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setConfirmDel(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={remove} disabled={saving}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
