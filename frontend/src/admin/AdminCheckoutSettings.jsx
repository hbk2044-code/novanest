import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'province', label: 'Province (Nepal)' },
  { value: 'district', label: 'District (Nepal)' },
  { value: 'city', label: 'City (Nepal)' },
]

const NEW_FIELD = { label: '', type: 'text', required: false, active: true, placeholder: '', options: '' }

export default function AdminCheckoutSettings() {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [newField, setNewField] = useState(NEW_FIELD)
  const [editId, setEditId] = useState(null)
  const toast = useToast()

  const load = () => {
    api.get('/admin/settings/checkout-fields')
      .then((d) => setFields(d.fields))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const updateField = async (id, patch) => {
    try {
      await api.put(`/admin/settings/checkout-fields/${id}`, patch)
      load()
    } catch (err) {
      toast.error(err.message || 'Update failed')
    }
  }

  const toggleActive = (f) => updateField(f.id, { active: !f.active })
  const toggleRequired = (f) => updateField(f.id, { required: !f.required })

  const removeField = async (f) => {
    try {
      const d = await api.del(`/admin/settings/checkout-fields/${f.id}`)
      toast.success(d.message || 'Field removed')
      load()
    } catch (err) {
      toast.error(err.message || 'Remove failed')
    }
  }

  const resetDefaults = async () => {
    if (!window.confirm('Reset the checkout form to the default fields?')) return
    try {
      const d = await api.post('/admin/settings/checkout-fields/reset')
      toast.success(d.message || 'Form reset')
      load()
    } catch (err) {
      toast.error(err.message || 'Reset failed')
    }
  }

  const addField = async (e) => {
    e.preventDefault()
    if (!newField.label.trim()) return toast.error('Label is required')
    try {
      const payload = {
        label: newField.label,
        type: newField.type,
        required: newField.required,
        active: newField.active,
        placeholder: newField.placeholder,
        options: newField.type === 'select' ? newField.options.split(',').map((o) => o.trim()).filter(Boolean) : [],
      }
      const d = await api.post('/admin/settings/checkout-fields', payload)
      toast.success(`Field "${d.field.label}" added`)
      setAddOpen(false)
      setNewField(NEW_FIELD)
      load()
    } catch (err) {
      toast.error(err.message || 'Add failed')
    }
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    const f = fields.find((x) => x.id === editId)
    if (!f) return
    try {
      await api.put(`/admin/settings/checkout-fields/${editId}`, {
        label: f.label,
        type: f.type,
        placeholder: f.placeholder,
        options: f.type === 'select' ? (f.options || []) : [],
      })
      toast.success('Field updated')
      setEditId(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Update failed')
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div>
      <div className="section-title">
        <h2>Checkout Delivery Form</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={resetDefaults}>Reset to Defaults</button>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>+ Add Field</button>
        </div>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20, maxWidth: 720 }}>
        Control every field on the customer's checkout delivery form. Toggle a field
        <strong> Active</strong> to show/hide it, toggle <strong>Mandatory</strong> to make it
        required or optional. Built-in fields cannot be deleted but can be hidden. Custom fields
        can be fully removed.
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Field</th>
              <th>Key</th>
              <th>Type</th>
              <th>Active</th>
              <th>Mandatory</th>
              <th>Built-in</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.id} style={!f.active ? { opacity: 0.5 } : {}}>
                <td style={{ color: 'var(--muted)' }}>{f.id}</td>
                <td style={{ fontWeight: 600 }}>{f.label}</td>
                <td style={{ color: 'var(--muted)', fontSize: 13 }}>{f.key}</td>
                <td style={{ fontSize: 13, textTransform: 'capitalize' }}>{f.type}</td>
                <td>
                  <label className="switch">
                    <input type="checkbox" checked={f.active} onChange={() => toggleActive(f)} />
                    <span className="slider" />
                  </label>
                </td>
                <td>
                  <label className="switch">
                    <input type="checkbox" checked={f.required} onChange={() => toggleRequired(f)} />
                    <span className="slider" />
                  </label>
                </td>
                <td>
                  {f.builtin ? <span className="badge badge-pending">Built-in</span> : <span style={{ color: 'var(--muted)', fontSize: 13 }}>Custom</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditId(f.id)}>Edit</button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removeField(f)}
                      disabled={f.builtin}
                      title={f.builtin ? 'Built-in fields cannot be removed — deactivate instead' : ''}
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {fields.length === 0 && (
              <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--muted)' }}>No fields configured. Add some or reset to defaults.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editId && (
        <div className="modal-overlay" onClick={() => setEditId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Field</h2>
            <form onSubmit={saveEdit}>
              {(() => {
                const f = fields.find((x) => x.id === editId)
                if (!f) return null
                const setF = (patch) => setFields((fs) => fs.map((x) => (x.id === editId ? { ...x, ...patch } : x)))
                return (
                  <>
                    <div className="form-group">
                      <label>Label</label>
                      <input value={f.label} onChange={(e) => setF({ label: e.target.value })} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label>Type</label>
                        <select value={f.type} onChange={(e) => setF({ type: e.target.value })}>
                          {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Placeholder</label>
                        <input value={f.placeholder || ''} onChange={(e) => setF({ placeholder: e.target.value })} />
                      </div>
                    </div>
                    {f.type === 'select' && (
                      <div className="form-group">
                        <label>Options (comma separated)</label>
                        <input
                          value={(f.options || []).join(', ')}
                          onChange={(e) => setF({ options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })}
                          placeholder="e.g. Home, Office, Other"
                        />
                      </div>
                    )}
                    <div className="modal-actions">
                      <button type="button" className="btn btn-outline" onClick={() => setEditId(null)}>Cancel</button>
                      <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                  </>
                )
              })()}
            </form>
          </div>
        </div>
      )}

      {addOpen && (
        <div className="modal-overlay" onClick={() => setAddOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Field</h2>
            <form onSubmit={addField}>
              <div className="form-group">
                <label>Label *</label>
                <input
                  value={newField.label}
                  onChange={(e) => setNewField((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. City / District"
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Type</label>
                  <select value={newField.type} onChange={(e) => setNewField((f) => ({ ...f, type: e.target.value }))}>
                    {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Placeholder</label>
                  <input
                    value={newField.placeholder}
                    onChange={(e) => setNewField((f) => ({ ...f, placeholder: e.target.value }))}
                  />
                </div>
              </div>
              {newField.type === 'select' && (
                <div className="form-group">
                  <label>Options (comma separated)</label>
                  <input
                    value={newField.options}
                    onChange={(e) => setNewField((f) => ({ ...f, options: e.target.value }))}
                    placeholder="e.g. Home, Office, Other"
                  />
                </div>
              )}
              <div style={{ display: 'flex', gap: 24, margin: '8px 0 20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={newField.required} onChange={(e) => setNewField((f) => ({ ...f, required: e.target.checked }))} style={{ width: 17, height: 17 }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Mandatory</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={newField.active} onChange={(e) => setNewField((f) => ({ ...f, active: e.target.checked }))} style={{ width: 17, height: 17 }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Active</span>
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setAddOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Field</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
