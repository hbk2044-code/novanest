import { useEffect, useState } from 'react'
import { api, formatDate } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'

const EMPTY = { name: '', email: '', phone: '', address: '', role: 'customer', password: '' }

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const { user: me } = useAuth()
  const toast = useToast()
  const [modal, setModal] = useState(null) // 'create' | 'edit'
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [pwModal, setPwModal] = useState(null)
  const [pwForm, setPwForm] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    api.get('/admin/users').then((d) => setUsers(d.users)).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: val }))
  }

  const openCreate = () => {
    setModal('create')
    setEditing(null)
    setForm(EMPTY)
  }

  const openEdit = (u) => {
    setModal('edit')
    setEditing(u)
    setForm({ name: u.name, email: u.email, phone: u.phone || '', address: u.address || '', role: u.role, password: '' })
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (modal === 'create') {
        await api.post('/admin/users', {
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          address: form.address,
          role: form.role,
        })
        toast.success(`User ${form.name} created`)
      } else {
        await api.put(`/admin/users/${editing.id}`, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          role: form.role,
        })
        toast.success('User updated')
      }
      setModal(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    if (pwForm.length < 6) {
      return toast.error('Password must be at least 6 characters')
    }
    setSaving(true)
    try {
      await api.put(`/admin/users/${pwModal.id}/password`, { newPassword: pwForm })
      toast.success(`Password updated for ${pwModal.name}`)
      setPwModal(null)
      setPwForm('')
    } catch (err) {
      toast.error(err.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setSaving(true)
    try {
      const data = await api.del(`/admin/users/${confirmDel.id}`)
      toast.success(data.message || 'User deleted')
      setConfirmDel(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleRole = async (u) => {
    const nextRole = u.role === 'admin' ? 'customer' : 'admin'
    try {
      await api.put(`/admin/users/${u.id}`, { role: nextRole })
      toast.success(`${u.name} is now ${nextRole}`)
      load()
    } catch (err) {
      toast.error(err.message || 'Update failed')
    }
  }

  return (
    <div>
      <div className="section-title">
        <h2>Users ({users.length})</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Add User</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Orders</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ color: 'var(--muted)' }}>#{u.id}</td>
                <td style={{ fontWeight: 600 }}>
                  {u.name} {u.id === me?.id && <span style={{ fontSize: 11, color: 'var(--muted)' }}>(you)</span>}
                </td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-shipped' : 'badge-pending'}`}>
                    {u.role}
                  </span>
                </td>
                <td style={{ fontSize: 13 }}>{u.phone || '—'}</td>
                <td>{u.orderCount}</td>
                <td style={{ fontSize: 13, color: 'var(--muted)' }}>{formatDate(u.createdAt)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>Edit</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setPwModal(u); setPwForm('') }}>Password</button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => toggleRole(u)}
                      disabled={u.id === me?.id}
                      title={u.id === me?.id ? 'You cannot change your own role' : ''}
                    >
                      {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setConfirmDel(u)}
                      disabled={u.id === me?.id}
                      title={u.id === me?.id ? 'You cannot delete your own account' : ''}
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
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal === 'create' ? 'Add New User' : `Edit User #${editing.id}`}</h2>
            <form onSubmit={save}>
              <div className="form-group">
                <label>Full Name *</label>
                <input value={form.name} onChange={set('name')} required />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" value={form.email} onChange={set('email')} required />
              </div>
              {modal === 'create' && (
                <div className="form-group">
                  <label>Password * (min 6 characters)</label>
                  <input type="password" value={form.password} onChange={set('password')} required />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={set('phone')} />
                </div>
                <div className="form-group">
                  <label>Role *</label>
                  <select value={form.role} onChange={set('role')}>
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input value={form.address} onChange={set('address')} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : modal === 'create' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pwModal && (
        <div className="modal-overlay" onClick={() => setPwModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Change Password</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>
              Set a new password for <strong style={{ color: 'var(--ink)' }}>{pwModal.name}</strong> ({pwModal.email}).
            </p>
            <form onSubmit={savePassword}>
              <div className="form-group">
                <label>New Password * (min 6 characters)</label>
                <input
                  type="password"
                  value={pwForm}
                  onChange={(e) => setPwForm(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setPwModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete User</h2>
            <p>
              Are you sure you want to delete <strong>{confirmDel.name}</strong> ({confirmDel.email})?
              Their cart will be cleared and orders will be kept in records. This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setConfirmDel(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={remove} disabled={saving}>
                {saving ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
