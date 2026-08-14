import { useEffect, useState } from 'react'
import { api, formatPrice } from '../api.js'
import { useToast } from '../components/Toast.jsx'

const STATUS_LABEL = { in: 'In Stock', low: 'Low Stock', out: 'Out of Stock' }

const MOVEMENT_LABEL = {
  initial: 'Opening',
  restock: 'Restock',
  adjustment: 'Adjustment',
  sale: 'Sale',
}

export default function AdminInventory() {
  const [items, setItems] = useState([])
  const [counts, setCounts] = useState({ total: 0, inStock: 0, lowStock: 0, outOfStock: 0 })
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const toast = useToast()

  const [modal, setModal] = useState(null) // {type:'restock'|'adjust'|'edit', item}
  const [movementItem, setMovementItem] = useState(null)
  const [movements, setMovements] = useState([])
  const [mQty, setMQty] = useState('')
  const [mNote, setMNote] = useState('')
  const [editForm, setEditForm] = useState({ sku: '', reorderLevel: '', location: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    const q = params.toString() ? `?${params}` : ''
    api.get(`/admin/inventory${q}`)
      .then((d) => { setItems(d.items); setCounts(d.counts) })
      .catch(() => {})
      .finally(() => setLoading(false))
    api.get('/admin/inventory/stats').then(setStats).catch(() => {})
  }

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [search, status])

  const badge = (s) => `badge badge-${s === 'in' ? 'delivered' : s === 'low' ? 'pay-pending' : 'cancelled'}`

  const openModal = (type, item) => {
    setModal({ type, item })
    setMQty('')
    setMNote('')
    if (type === 'edit') setEditForm({ sku: item.sku, reorderLevel: item.reorderLevel, location: item.location })
  }

  const submit = async (e) => {
    e.preventDefault()
    const { type, item } = modal
    setSaving(true)
    try {
      if (type === 'restock') {
        await api.post(`/admin/inventory/${item.id}/restock`, { quantity: Number(mQty), note: mNote })
        toast.success(`Restocked ${mQty} × ${item.name}`)
      } else if (type === 'adjust') {
        await api.post(`/admin/inventory/${item.id}/adjust`, { quantity: Number(mQty), note: mNote })
        toast.success(`Adjusted stock for ${item.name}`)
      } else {
        await api.put(`/admin/inventory/${item.id}`, editForm)
        toast.success('Inventory settings updated')
      }
      setModal(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Action failed')
    } finally {
      setSaving(false)
    }
  }

  const openMovements = async (item) => {
    setMovementItem(item)
    setMovements([])
    try {
      const d = await api.get(`/admin/inventory/movements?productId=${item.id}`)
      setMovements(d.movements)
    } catch (err) {
      toast.error(err.message || 'Could not load history')
    }
  }

  const statCards = stats
    ? [
        { label: 'Total SKUs', value: stats.totalSkus, icon: '📦' },
        { label: 'Units in Stock', value: stats.totalUnits.toLocaleString('en-IN'), icon: '📊' },
        { label: 'Stock Value', value: formatPrice(stats.totalValue), icon: '💰' },
        { label: 'Stock Cost', value: formatPrice(stats.totalCost), icon: '🧾' },
        { label: 'Potential Profit', value: formatPrice(stats.potentialProfit), icon: '📈' },
        { label: 'Low Stock', value: stats.lowStock, icon: '⚠️' },
        { label: 'Out of Stock', value: stats.outOfStock, icon: '🚫' },
      ]
    : []

  return (
    <div>
      <div className="section-title">
        <h2>Inventory Management</h2>
      </div>

      {statCards.length > 0 && (
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {statCards.map((s) => (
            <div className="stat-card" key={s.label}>
              <span className="stat-icon">{s.icon}</span>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 17 }}>{s.value}</div>
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
            placeholder="Search by SKU, product, category or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {[
          { value: '', label: `All (${counts.total})` },
          { value: 'in', label: `In Stock (${counts.inStock})` },
          { value: 'low', label: `Low Stock (${counts.lowStock})` },
          { value: 'out', label: `Out of Stock (${counts.outOfStock})` },
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
              <th>SKU</th>
              <th>Product</th>
              <th>Category</th>
              <th>Location</th>
              <th>Price</th>
              <th>Cost</th>
              <th>Margin</th>
              <th>In Stock</th>
              <th>Reorder</th>
              <th>Status</th>
              <th>Stock Value</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="12" style={{ textAlign: 'center', color: 'var(--muted)' }}>Loading...</td></tr>}
            {!loading && items.length === 0 && (
              <tr><td colSpan="12" style={{ textAlign: 'center', color: 'var(--muted)' }}>No inventory items found</td></tr>
            )}
            {items.map((i) => (
              <tr key={i.id}>
                <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{i.sku}</td>
                <td style={{ fontWeight: 600 }}>{i.name}</td>
                <td style={{ fontSize: 13 }}>{i.category}</td>
                <td style={{ fontSize: 13, color: 'var(--muted)' }}>{i.location}</td>
                <td>{formatPrice(i.price)}</td>
                <td style={{ fontSize: 13, color: 'var(--muted)' }}>{formatPrice(i.costPrice)}</td>
                <td style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>{i.profitMargin}%</td>
                <td>
                  <span style={{ fontWeight: 800, color: i.status === 'out' ? 'var(--danger)' : 'inherit' }}>{i.stock}</span>
                </td>
                <td style={{ fontSize: 13, color: 'var(--muted)' }}>{i.reorderLevel}</td>
                <td><span className={badge(i.status)}>{STATUS_LABEL[i.status]}</span></td>
                <td style={{ fontSize: 13 }}>{formatPrice(i.stockValue)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn-success btn-sm" onClick={() => openModal('restock', i)}>Restock</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => openModal('adjust', i)}>Adjust</button>
                    <button className="btn btn-outline btn-sm" onClick={() => openModal('edit', i)}>Settings</button>
                    <button className="btn btn-outline btn-sm" onClick={() => openMovements(i)}>History</button>
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
            <h2>
              {modal.type === 'restock' && `Restock — ${modal.item.name}`}
              {modal.type === 'adjust' && `Adjust Stock — ${modal.item.name}`}
              {modal.type === 'edit' && `Inventory Settings — ${modal.item.name}`}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: -10, marginBottom: 16 }}>
              SKU: {modal.item.sku} · Current stock: <strong>{modal.item.stock}</strong> · Reorder at {modal.item.reorderLevel}
            </p>
            <form onSubmit={submit}>
              {modal.type === 'restock' && (
                <>
                  <div className="form-group">
                    <label>Quantity to Add *</label>
                    <input type="number" min="1" required value={mQty} onChange={(e) => setMQty(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Note (optional)</label>
                    <input value={mNote} onChange={(e) => setMNote(e.target.value)} placeholder="e.g. Supplier: Aakash Traders, PO #1042" />
                  </div>
                </>
              )}
              {modal.type === 'adjust' && (
                <>
                  <div className="form-group">
                    <label>Change (+ to add, - to remove) *</label>
                    <input type="number" required value={mQty} onChange={(e) => setMQty(e.target.value)} placeholder="e.g. -5 or +20" />
                  </div>
                  <div className="form-group">
                    <label>Reason *</label>
                    <input value={mNote} onChange={(e) => setMNote(e.target.value)} placeholder="e.g. Damaged stock, miscount, returned item" required />
                  </div>
                </>
              )}
              {modal.type === 'edit' && (
                <>
                  <div className="form-group">
                    <label>SKU</label>
                    <input value={editForm.sku} onChange={(e) => setEditForm((f) => ({ ...f, sku: e.target.value }))} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label>Reorder Level</label>
                      <input type="number" min="0" value={editForm.reorderLevel} onChange={(e) => setEditForm((f) => ({ ...f, reorderLevel: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Location</label>
                      <input value={editForm.location} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} />
                    </div>
                  </div>
                </>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : modal.type === 'restock' ? 'Add Stock' : modal.type === 'adjust' ? 'Apply Adjustment' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {movementItem && (
        <div className="modal-overlay" onClick={() => setMovementItem(null)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
              <div>
                <h2 style={{ marginBottom: 0 }}>Stock History — {movementItem.name}</h2>
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>{movementItem.sku} · Current stock: {movementItem.stock}</p>
              </div>
            </div>
            <div className="table-wrap" style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Note</th>
                    <th>By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--muted)' }}>No movements recorded</td></tr>
                  )}
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td><span className={`badge ${m.quantity > 0 ? 'badge-delivered' : 'badge-cancelled'}`}>{MOVEMENT_LABEL[m.type] || m.type}</span></td>
                      <td style={{ fontWeight: 700, color: m.quantity > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td style={{ fontSize: 13 }}>{m.note}</td>
                      <td style={{ fontSize: 13 }}>{m.user}</td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {new Date(m.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setMovementItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
