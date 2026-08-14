import { useEffect, useRef, useState } from 'react'
import { api, formatPrice, categoryGradient, categoryIcon } from '../api.js'
import { useToast } from '../components/Toast.jsx'

const EMPTY = {
  name: '',
  categoryId: '',
  description: '',
  price: '',
  oldPrice: '',
  costPrice: '',
  stock: '',
  reorderLevel: '10',
  location: 'Main Store',
  rating: '4.5',
  featured: true,
  image: '',
}

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [confirmDel, setConfirmDel] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const toast = useToast()

  const load = () => {
    api.get('/admin/products').then((d) => setProducts(d.products)).catch(() => {})
    api.get('/admin/categories').then((d) => setCategories(d.categories)).catch(() => {})
  }

  useEffect(() => {
    load()
    setLoading(false)
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY, categoryId: categories[0]?.id || '' })
    setModal(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({
      name: p.name,
      categoryId: p.categoryId,
      description: p.description,
      price: p.price,
      oldPrice: p.oldPrice || '',
      costPrice: p.costPrice || '',
      stock: p.stock,
      reorderLevel: p.reorderLevel || 10,
      location: p.location || 'Main Store',
      rating: p.rating,
      featured: p.featured,
      image: p.image || '',
    })
    setModal(true)
  }

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: val }))
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }
    setUploading(true)
    try {
      const url = await api.uploadImage(file)
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
    if (!form.name.trim() || !form.categoryId) {
      return toast.error('Name and category are required')
    }
    try {
      if (editing) {
        await api.put(`/admin/products/${editing.id}`, form)
        toast.success('Product updated')
      } else {
        await api.post('/admin/products', form)
        toast.success('Product created')
      }
      setModal(false)
      load()
    } catch (err) {
      toast.error(err.message || 'Save failed')
    }
  }

  const remove = async () => {
    try {
      await api.del(`/admin/products/${confirmDel.id}`)
      toast.success(`${confirmDel.name} deleted`)
      setConfirmDel(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div>
      <div className="section-title">
        <h2>Products ({products.length})</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Product</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Cost</th>
              <th>Stock</th>
              <th>Sold</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      style={{ width: 46, height: 46, borderRadius: 10, objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <span
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 10,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        background: categoryGradient(p.categorySlug || p.categoryName?.toLowerCase().replace(/\s+/g, '-')),
                      }}
                    >
                      {categoryIcon(p.categorySlug || '')}
                    </span>
                  )}
                </td>
                <td style={{ color: 'var(--muted)' }}>{p.sku}</td>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>{p.categoryName}</td>
                <td style={{ fontWeight: 700 }}>{formatPrice(p.price)}</td>
                <td style={{ fontSize: 13, color: 'var(--muted)' }}>{formatPrice(p.costPrice || 0)}</td>
                <td>
                  <span style={p.stock <= 10 ? { color: 'var(--danger)', fontWeight: 700 } : {}}>{p.stock}</span>
                </td>
                <td>{p.sold}</td>
                <td>{p.featured ? '⭐' : '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(p)}>Delete</button>
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
            <h2>{editing ? `Edit Product #${editing.id}` : 'Add Product'}</h2>
            <form onSubmit={save}>
              <div className="form-group">
                <label>Product Image</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 84,
                      height: 84,
                      borderRadius: 14,
                      overflow: 'hidden',
                      background: categoryGradient(form.categoryId ? categories.find((c) => c.id === Number(form.categoryId))?.slug || '' : ''),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 36,
                      flexShrink: 0,
                      border: '1px solid var(--border)',
                    }}
                  >
                    {form.image ? (
                      <img
                        src={form.image}
                        alt="preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <span>📷</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFile}
                      disabled={uploading}
                      style={{ padding: 6 }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      {form.image && (
                        <button type="button" className="btn btn-danger btn-sm" onClick={clearImage}>
                          Remove Image
                        </button>
                      )}
                      {uploading && (
                        <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>Uploading...</span>
                      )}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                  JPG, PNG, WebP or GIF up to 5MB.
                </p>
              </div>
              <div className="form-group">
                <label>Name *</label>
                <input value={form.name} onChange={set('name')} required />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <select value={form.categoryId} onChange={set('categoryId')} required>
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows="2" value={form.description} onChange={set('description')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Price (Rs.) *</label>
                  <input type="number" min="0" value={form.price} onChange={set('price')} required />
                </div>
                <div className="form-group">
                  <label>Old Price (Rs.)</label>
                  <input type="number" min="0" value={form.oldPrice} onChange={set('oldPrice')} />
                </div>
                <div className="form-group">
                  <label>Cost Price (Rs.)</label>
                  <input type="number" min="0" value={form.costPrice} onChange={set('costPrice')} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Stock *</label>
                  <input type="number" min="0" value={form.stock} onChange={set('stock')} required />
                </div>
                <div className="form-group">
                  <label>Reorder Level</label>
                  <input type="number" min="0" value={form.reorderLevel} onChange={set('reorderLevel')} />
                </div>
                <div className="form-group">
                  <label>Storage Location</label>
                  <input type="text" value={form.location} onChange={set('location')} placeholder="e.g. Main Store, Aisle 2" />
                </div>
                <div className="form-group">
                  <label>Rating (1-5)</label>
                  <input type="number" step="0.1" min="1" max="5" value={form.rating} onChange={set('rating')} />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 20px' }}>
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={set('featured')}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Featured product</span>
              </label>
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
            <h2>Delete Product</h2>
            <p>Are you sure you want to delete <strong>{confirmDel.name}</strong>? This cannot be undone.</p>
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
