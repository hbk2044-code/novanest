import { useEffect, useState } from 'react'
import { api, formatPrice, formatDate } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import ProductPicker from '../components/ProductPicker.jsx'

const STATUS_META = {
  pending: { label: 'Pending', cls: 'badge-pay-pending' },
  'due soon': { label: 'Due Soon', cls: 'badge-low' },
  overdue: { label: 'Overdue', cls: 'badge-cancelled' },
  paid: { label: 'Paid', cls: 'badge-delivered' },
}

export const UNITS = ['Pcs', 'Kg', 'Liter', 'Sack', 'Box', 'Pack', 'Dozen', 'Pair', 'Bottle']

export default function AdminPurchases() {
  const [purchases, setPurchases] = useState([])
  const [summary, setSummary] = useState(null)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const toast = useToast()

  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState(null)
  const [payModal, setPayModal] = useState(null)
  const [payForm, setPayForm] = useState({ amount: '', method: 'Bank Transfer', note: '' })

  const [newProd, setNewProd] = useState(null)
  const [newProdForm, setNewProdForm] = useState({ name: '', categoryId: '', price: '', costPrice: '', stock: '' })
  const [savingProd, setSavingProd] = useState(false)

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    const q = params.toString() ? `?${params}` : ''
    api.get(`/admin/purchases${q}`)
      .then((d) => setPurchases(d.purchases))
      .catch(() => {})
      .finally(() => setLoading(false))
    api.get('/admin/purchases/summary').then(setSummary).catch(() => {})
    api.get('/admin/products').then((d) => setProducts(d.products)).catch(() => {})
    api.get('/admin/categories').then((d) => setCategories(d.categories)).catch(() => {})
  }

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [search, status])

  const openCreate = () => {
    const due = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    setEditing(null)
    setForm({
      supplier: '',
      supplierPhone: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      dueDate: due,
      notes: '',
      items: [{ productId: '', quantity: 1, unitCost: '', unit: '' }],
    })
    setModal(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({
      supplier: p.supplier,
      supplierPhone: p.supplierPhone || '',
      purchaseDate: (p.purchaseDate || '').slice(0, 10),
      dueDate: (p.dueDate || '').slice(0, 10),
      notes: p.notes || '',
      items: p.items.map((i) => ({
        productId: String(i.productId),
        quantity: i.quantity,
        unitCost: i.unitCost,
        unit: i.unit || '',
      })),
    })
    setModal(true)
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setItem = (idx, k) => (e) => {
    setForm((f) => {
      const items = f.items.map((it, i) => (i === idx ? { ...it, [k]: e.target.value } : it))
      return { ...f, items }
    })
  }
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { productId: '', quantity: 1, unitCost: '', unit: '' }] }))
  const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))

  const pickProduct = (idx, id) => {
    const prod = products.find((p) => String(p.id) === String(id))
    setItem(idx, 'productId')({ target: { value: id } })
    if (prod && prod.unit) setItem(idx, 'unit')({ target: { value: prod.unit } })
  }

  const lineTotal = (it) => (Number(it.quantity) || 0) * (Number(it.unitCost) || 0)
  const formTotal = () => (form?.items || []).reduce((s, it) => s + lineTotal(it), 0)

  const openNewProduct = (itemIdx, name = '') => {
    setNewProd(itemIdx)
    setNewProdForm({ name, categoryId: '', price: '', costPrice: '', stock: '', unit: 'Pcs' })
  }

  const setNewProdField = (k) => (e) => setNewProdForm((f) => ({ ...f, [k]: e.target.value }))

  const createProduct = async (e) => {
    e.preventDefault()
    if (!newProdForm.name.trim()) return toast.error('Product name is required')
    if (!newProdForm.categoryId) return toast.error('Select a category')
    setSavingProd(true)
    try {
      const { product } = await api.post('/admin/products', {
        name: newProdForm.name,
        categoryId: Number(newProdForm.categoryId),
        description: '',
        price: Number(newProdForm.price) || 0,
        costPrice: Number(newProdForm.costPrice) || 0,
        stock: Number(newProdForm.stock) || 0,
        unit: newProdForm.unit || 'Pcs',
      })
      toast.success(`Product "${product.name}" created`)
      setNewProd(null)
      setForm((f) => ({
        ...f,
        items: f.items.map((it, i) =>
          i === newProd ? { ...it, productId: String(product.id), unit: product.unit || 'Pcs' } : it
        ),
      }))
      api.get('/admin/products').then((d) => setProducts(d.products)).catch(() => {})
    } catch (err) {
      toast.error(err.message || 'Could not create product')
    } finally {
      setSavingProd(false)
    }
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.supplier.trim()) return toast.error('Supplier name is required')
    if (form.items.length === 0) return toast.error('Add at least one item')
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/admin/purchases/${editing.id}`, {
          supplier: form.supplier,
          supplierPhone: form.supplierPhone,
          dueDate: form.dueDate,
          notes: form.notes,
          items: form.items,
        })
        toast.success('Purchase updated')
      } else {
        await api.post('/admin/purchases', form)
        toast.success('Stock intake recorded')
      }
      setModal(false)
      load()
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (p) => {
    if (!window.confirm(`Delete ${p.purchaseNo}? Stock will be reversed.`)) return
    try {
      await api.del(`/admin/purchases/${p.id}`)
      toast.success(`${p.purchaseNo} deleted`)
      load()
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    }
  }

  const openDetail = async (p) => {
    try {
      const d = await api.get(`/admin/purchases/${p.id}`)
      setDetail(d.purchase)
    } catch (err) {
      toast.error(err.message || 'Could not load purchase')
    }
  }

  const openPay = (p) => {
    setPayModal(p)
    setPayForm({ amount: String(p.balance), method: 'Bank Transfer', note: '' })
  }

  const savePayment = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/admin/purchases/${payModal.id}/payments`, payForm)
      toast.success('Payment recorded')
      setPayModal(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Payment failed')
    }
  }

  const statCards = summary
    ? [
        { label: 'Total Intake Value', value: formatPrice(purchases.reduce((s, p) => s + p.total, 0)), icon: '📥' },
        { label: 'Total Owed to Suppliers', value: formatPrice(summary.totalOwed), icon: '💳' },
        { label: 'Due Soon', value: formatPrice(summary.dueSoon), icon: '⏳', sub: `${summary.dueSoonCount} purchases` },
        { label: 'Overdue', value: formatPrice(summary.overdue), icon: '🚨', sub: `${summary.overdueCount} purchases` },
        { label: 'Total Paid', value: formatPrice(summary.paid), icon: '✅' },
      ]
    : []

  return (
    <div>
      <div className="section-title">
        <h2>Stock Intake (Input Items)</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Record Intake</button>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20, maxWidth: 760 }}>
        Record incoming stock purchased from suppliers. Stock is added automatically and a
        payment obligation is created — due in <strong>35 days</strong> by default. Track
        pending, due-soon and overdue supplier payments here.
      </p>

      {statCards.length > 0 && (
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {statCards.map((s) => (
            <div className="stat-card" key={s.label}>
              <span className="stat-icon">{s.icon}</span>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 19 }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.sub}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="toolbar">
        <div className="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search by product, PO number, supplier or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {[
          { value: '', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'due soon', label: 'Due Soon' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'paid', label: 'Paid' },
        ].map((c) => (
          <button key={c.value || 'all'} className={`chip ${status === c.value ? 'active' : ''}`} onClick={() => setStatus(c.value)}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>PO #</th>
              <th>Supplier</th>
              <th>Intake Date</th>
              <th>Due Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Payment Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="10" style={{ textAlign: 'center', color: 'var(--muted)' }}>Loading...</td></tr>}
            {!loading && purchases.length === 0 && (
              <tr><td colSpan="10" style={{ textAlign: 'center', color: 'var(--muted)' }}>No purchases found</td></tr>
            )}
            {purchases.map((p) => {
              const meta = STATUS_META[p.paymentStatus] || STATUS_META.pending
              const days = p.daysLeft
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.purchaseNo}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.supplier}</div>
                    {p.supplierPhone && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.supplierPhone}</div>}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{formatDate(p.purchaseDate)}</td>
                  <td style={{ fontSize: 13 }}>
                    {formatDate(p.dueDate)}
                    {p.paymentStatus === 'due soon' && days >= 0 && (
                      <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>Due in {days}d</div>
                    )}
                    {p.paymentStatus === 'overdue' && (
                      <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 700 }}>{Math.abs(days)}d overdue</div>
                    )}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {p.items.map((i) => (
                      <div key={i.productId} style={{ lineHeight: 1.5 }}>
                        {i.productName}
                        {i.quantity != null && (
                          <span style={{ color: 'var(--muted)' }}>
                            {' '}× {i.quantity} {i.unit || ''}
                          </span>
                        )}
                      </div>
                    ))}
                  </td>
                  <td style={{ fontWeight: 700 }}>{formatPrice(p.total)}</td>
                  <td style={{ fontSize: 13, color: 'var(--success)' }}>{formatPrice(p.paidAmount)}</td>
                  <td style={{ fontSize: 13, color: p.balance > 0 ? 'var(--danger)' : 'inherit', fontWeight: 600 }}>
                    {formatPrice(p.balance)}
                  </td>
                  <td><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openDetail(p)}>View</button>
                      {p.balance > 0 && (
                        <button className="btn btn-success btn-sm" onClick={() => openPay(p)}>Payment</button>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>Delete</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? `Edit ${editing.purchaseNo}` : 'Record Stock Intake'}</h2>
            <form onSubmit={save}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Supplier Name *</label>
                  <input value={form.supplier} onChange={set('supplier')} placeholder="e.g. Aakash Traders" required />
                </div>
                <div className="form-group">
                  <label>Supplier Phone</label>
                  <input value={form.supplierPhone} onChange={set('supplierPhone')} placeholder="+977-98XXXXXXXX" />
                </div>
                <div className="form-group">
                  <label>Intake Date</label>
                  <input type="date" value={form.purchaseDate} onChange={set('purchaseDate')} />
                </div>
                <div className="form-group">
                  <label>Payment Due Date (35-day credit)</label>
                  <input type="date" value={form.dueDate} onChange={set('dueDate')} required />
                </div>
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 800, margin: '14px 0 10px' }}>Items Incoming</h3>
              <div className="table-wrap" style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 10 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style={{ width: 140 }}>Qty</th>
                      <th style={{ width: 120 }}>Unit</th>
                      <th style={{ width: 160 }}>Unit Cost (Rs.)</th>
                      <th style={{ width: 130 }}>Subtotal</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((it, idx) => (
                      <tr key={idx}>
                        <td style={{ minWidth: 260 }}>
                          <ProductPicker
                            products={products}
                            value={it.productId}
                            onChange={(id) => pickProduct(idx, id)}
                            onCreateNew={(name) => openNewProduct(idx, name)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={it.quantity}
                            onChange={setItem(idx, 'quantity')}
                            required
                            className="num-wide qty"
                            style={{ width: 110 }}
                            title="Quantity (up to 6+ digits)"
                          />
                        </td>
                        <td>
                          <select value={it.unit || ''} onChange={setItem(idx, 'unit')} style={{ width: 100, padding: '10px 10px' }}>
                            <option value="">Unit</option>
                            {UNITS.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={it.unitCost}
                            onChange={setItem(idx, 'unitCost')}
                            placeholder="0"
                            required
                            className="unit-cost-wide"
                            style={{ width: 140 }}
                            title="Unit cost in Rs."
                          />
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 600 }}>{formatPrice(lineTotal(it))}</td>
                        <td>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => removeItem(idx)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={addItem}>+ Add Item</button>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, margin: '14px 0 4px' }}>
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>Total Intake Value:</span>
                <strong style={{ fontSize: 22 }}>{formatPrice(formTotal())}</strong>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea rows="2" value={form.notes} onChange={set('notes')} placeholder="e.g. Invoice #1042, delivery received" />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Update Purchase' : 'Record Intake & Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h2 style={{ marginBottom: 2 }}>{detail.purchaseNo} — {detail.supplier}</h2>
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                  Intake: {formatDate(detail.purchaseDate)} · Due: {formatDate(detail.dueDate)} · Balance:{' '}
                  <strong style={{ color: detail.balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {formatPrice(detail.balance)}
                  </strong>
                </p>
              </div>
              {detail.balance > 0 && (
                <button className="btn btn-success btn-sm" onClick={() => { setPayModal(detail); setDetail(null) }}>
                  Record Payment
                </button>
              )}
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Product</th><th>Qty</th><th>Unit</th><th>Unit Cost</th><th>Subtotal</th></tr>
                </thead>
                <tbody>
                  {detail.items.map((it, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{it.productName}</td>
                      <td>{it.quantity}</td>
                      <td>{it.unit || 'Pcs'}</td>
                      <td>{formatPrice(it.unitCost)}</td>
                      <td style={{ fontWeight: 600 }}>{formatPrice(it.subtotal)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'right', fontWeight: 800 }}>Total</td>
                    <td style={{ fontWeight: 800 }}>{formatPrice(detail.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 800, margin: '14px 0 10px' }}>Payment History</h3>
            {detail.payments.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>No payments recorded yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>Note</th><th>By</th></tr></thead>
                  <tbody>
                    {detail.payments.map((pay) => (
                      <tr key={pay.id}>
                        <td style={{ fontSize: 13 }}>{formatDate(pay.date)}</td>
                        <td style={{ fontSize: 13 }}>{pay.method}</td>
                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatPrice(pay.amount)}</td>
                        <td style={{ fontSize: 13 }}>{pay.note}</td>
                        <td style={{ fontSize: 13, color: 'var(--muted)' }}>{pay.createdBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {payModal && (
        <div className="modal-overlay" onClick={() => setPayModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Record Payment — {payModal.purchaseNo}</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: -8, marginBottom: 14 }}>
              Supplier: {payModal.supplier} · Balance due: <strong>{formatPrice(payModal.balance)}</strong>
            </p>
            <form onSubmit={savePayment}>
              <div className="form-group">
                <label>Amount (Rs.) *</label>
                <input type="number" min="0" step="0.01" max={payModal.balance} value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select value={payForm.method} onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}>
                  <option>Bank Transfer</option>
                  <option>Cash</option>
                  <option>Cheque</option>
                  <option>Mobile Payment</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Note (optional)</label>
                <input value={payForm.note} onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. paid via NMB transfer" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setPayModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {newProd !== null && (
        <div className="modal-overlay" onClick={() => setNewProd(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Product</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: -8, marginBottom: 14 }}>
              This product will be added to the catalog and then selected in your intake form.
            </p>
            <form onSubmit={createProduct}>
              <div className="form-group">
                <label>Product Name *</label>
                <input value={newProdForm.name} onChange={setNewProdField('name')} placeholder="e.g. Organic Basmati Rice 5kg" required autoFocus />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <select value={newProdForm.categoryId} onChange={setNewProdField('categoryId')} required>
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Selling Price (Rs.)</label>
                  <input type="number" min="0" step="0.01" value={newProdForm.price} onChange={setNewProdField('price')} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Cost Price (Rs.)</label>
                  <input type="number" min="0" step="0.01" value={newProdForm.costPrice} onChange={setNewProdField('costPrice')} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Opening Stock</label>
                  <input type="number" min="0" step="1" value={newProdForm.stock} onChange={setNewProdField('stock')} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <select value={newProdForm.unit} onChange={setNewProdField('unit')}>
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setNewProd(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingProd}>
                  {savingProd ? 'Creating...' : 'Create & Select Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
