import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatPrice, formatDate } from '../api.js'
import { useToast } from '../components/Toast.jsx'

const STATUS_META = {
  pending: { label: 'Pending', cls: 'badge-pay-pending' },
  'due soon': { label: 'Due Soon', cls: 'badge-low' },
  overdue: { label: 'Overdue', cls: 'badge-cancelled' },
  paid: { label: 'Paid', cls: 'badge-delivered' },
}

export default function AdminSupplierPayments() {
  const [purchases, setPurchases] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const toast = useToast()

  const [payModal, setPayModal] = useState(null)
  const [payForm, setPayForm] = useState({ amount: '', method: 'Bank Transfer', note: '' })

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    const q = params.toString() ? `?${params}` : ''
    api.get(`/admin/purchases${q}`)
      .then((d) => setPurchases(d.purchases))
      .catch(() => {})
      .finally(() => setLoading(false))
    api.get('/admin/purchases/summary').then(setSummary).catch(() => {})
  }

  useEffect(() => { load() }, [status])

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

  const reminders = summary
    ? [
        ...(summary.overdueCount > 0 ? [{ tone: 'danger', text: `${summary.overdueCount} supplier purchase(s) are overdue — total ${formatPrice(summary.overdue)}. Settle them to avoid credit issues.` }] : []),
        ...(summary.dueSoonCount > 0 ? [{ tone: 'warn', text: `${summary.dueSoonCount} supplier purchase(s) are due within 5 days — total ${formatPrice(summary.dueSoon)}. Schedule payments now.` }] : []),
      ]
    : []

  const statCards = summary
    ? [
        { label: 'Total Outstanding', value: formatPrice(summary.totalOwed), icon: '💳', sub: `${summary.count} purchases` },
        { label: 'Pending (not due)', value: formatPrice(summary.pending), icon: '🕓' },
        { label: 'Due Soon (≤5 days)', value: formatPrice(summary.dueSoon), icon: '⏳', sub: `${summary.dueSoonCount} purchases` },
        { label: 'Overdue (past 35d)', value: formatPrice(summary.overdue), icon: '🚨', sub: `${summary.overdueCount} purchases` },
        { label: 'Paid to Date', value: formatPrice(summary.paid), icon: '✅' },
      ]
    : []

  return (
    <div>
      <div className="section-title">
        <h2>Supplier Payments</h2>
        <Link to="/admin/purchases" className="btn btn-outline btn-sm">Stock Intake →</Link>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16, maxWidth: 760 }}>
        Track payments owed to suppliers for stock intake. Purchases use a <strong>35-day credit
        term</strong>: payments are <strong>Pending</strong> until 5 days remain, then flagged{' '}
        <strong>Due Soon</strong>, and become <strong>Overdue</strong> past the due date.
      </p>

      {reminders.length > 0 && (
        <div style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reminders.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                background: r.tone === 'danger' ? '#fef2f2' : '#fffbeb',
                color: r.tone === 'danger' ? '#b91c1c' : '#92400e',
                border: `1px solid ${r.tone === 'danger' ? '#fecaca' : '#fde68a'}`,
              }}
            >
              <span style={{ fontSize: 18 }}>{r.tone === 'danger' ? '🚨' : '⏳'}</span>
              <span>{r.text}</span>
            </div>
          ))}
        </div>
      )}

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
              <th>Due Date</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--muted)' }}>Loading...</td></tr>}
            {!loading && purchases.length === 0 && (
              <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--muted)' }}>No supplier payments found</td></tr>
            )}
            {purchases.map((p) => {
              const meta = STATUS_META[p.paymentStatus] || STATUS_META.pending
              const days = p.daysLeft
              return (
                <tr key={p.id} style={p.paymentStatus === 'overdue' ? { background: '#fef2f2' } : p.paymentStatus === 'due soon' ? { background: '#fffbeb' } : {}}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.purchaseNo}</td>
                  <td style={{ fontWeight: 600 }}>{p.supplier}</td>
                  <td style={{ fontSize: 13 }}>
                    {formatDate(p.dueDate)}
                    {p.paymentStatus === 'due soon' && days >= 0 && (
                      <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>Due in {days}d</div>
                    )}
                    {p.paymentStatus === 'overdue' && (
                      <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 700 }}>{Math.abs(days)}d overdue</div>
                    )}
                  </td>
                  <td style={{ fontWeight: 700 }}>{formatPrice(p.total)}</td>
                  <td style={{ fontSize: 13, color: 'var(--success)' }}>{formatPrice(p.paidAmount)}</td>
                  <td style={{ fontSize: 13, color: p.balance > 0 ? 'var(--danger)' : 'inherit', fontWeight: 600 }}>
                    {formatPrice(p.balance)}
                  </td>
                  <td><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
                  <td>
                    {p.balance > 0 ? (
                      <button className="btn btn-success btn-sm" onClick={() => openPay(p)}>Record Payment</button>
                    ) : (
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

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
    </div>
  )
}
