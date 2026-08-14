import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'

const EMPTY = { name: '', icon: '🛍️', color: '#8b5cf6', description: '' }

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [confirmDel, setConfirmDel] = useState(null)
  const toast = useToast()

  const load = () => {
    api.get('/admin/categories').then((d) => setCategories(d.categories)).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setModal(true)
  }
  const openEdit = (c) => {
    setEditing(c)
    setForm({ name: c.name, icon: c.icon, color: c.color, description: c.description })
    setModal(true)
  }
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Category name is required')
    try {
      if (editing) {
        await api.put(`/admin/categories/${editing.id}`, form)
        toast.success('Category updated')
      } else {
        await api.post('/admin/categories', form)
        toast.success('Category created')
      }
      setModal(false)
      load()
    } catch (err) {
      toast.error(err.message || 'Save failed')
    }
  }

  const remove = async () => {
    try {
      await api.del(`/admin/categories/${confirmDel.id}`)
      toast.success('Category deleted')
      setConfirmDel(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    }
  }

  return (
    <div>
      <div className="section-title">
        <h2>Categories ({categories.length})</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Category</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Icon</th>
              <th>Name</th>
              <th>Slug</th>
              <th>Products</th>
              <th>Color</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td style={{ fontSize: 22 }}>{c.icon}</td>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td style={{ color: 'var(--muted)' }}>{c.slug}</td>
                <td>{c.productCount}</td>
                <td>
                  <span style={{ display: 'inline-block', width: 22, height: 22, borderRadius: 6, background: c.color, verticalAlign: 'middle' }} />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>Edit</button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setConfirmDel(c)}
                      disabled={c.productCount > 0}
                      title={c.productCount > 0 ? 'Move products first' : ''}
                    >
                      Delete
                    </button>
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
            <h2>{editing ? 'Edit Category' : 'Add Category'}</h2>
            <form onSubmit={save}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Icon (emoji)</label>
                  <input value={form.icon} onChange={set('icon')} />
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <input type="color" value={form.color} onChange={set('color')} style={{ padding: 4, height: 44 }} />
                </div>
              </div>
              <div className="form-group">
                <label>Name *</label>
                <input value={form.name} onChange={set('name')} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input value={form.description} onChange={set('description')} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Category</h2>
            <p>Are you sure you want to delete <strong>{confirmDel.name}</strong>?</p>
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
