import { useEffect, useState } from 'react'
import { api, formatDate } from '../api.js'
import { useToast } from '../components/Toast.jsx'

const STATUS_META = {
  pending: { label: 'Pending', color: '#b45309', bg: '#fef3c7' },
  approved: { label: 'Approved', color: '#166534', bg: '#dcfce7' },
  rejected: { label: 'Rejected', color: '#991b1b', bg: '#fee2e2' },
  hidden: { label: 'Hidden', color: '#374151', bg: '#f3f4f6' },
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState([])
  const [counts, setCounts] = useState({})
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [showDefaultRating, setShowDefaultRating] = useState(false)
  const [savingSetting, setSavingSetting] = useState(false)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const load = (opts = {}) => {
    if (!opts.silent) setLoading(true)
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (search.trim()) params.set('search', search.trim())
    api.get(`/admin/reviews?${params.toString()}`)
      .then((d) => {
        setReviews(d.reviews)
        setCounts(d.counts)
        setSelected((sel) => sel.filter((id) => d.reviews.some((r) => r.id === id)))
      })
      .catch((e) => toast.error(e.message || 'Could not load reviews'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.get('/admin/settings/reviews')
      .then((d) => setShowDefaultRating(!!d.showDefaultRating))
      .catch(() => {})
  }, [status])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!search.trim()) load() }, [search])

  const doSearch = () => load()

  const toggleDefaultRating = () => {
    if (savingSetting) return
    const next = !showDefaultRating
    setSavingSetting(true)
    api.put('/admin/settings/reviews', { showDefaultRating: next })
      .then((d) => {
        setShowDefaultRating(!!d.showDefaultRating)
        toast.success(d.showDefaultRating ? 'Default ratings are now shown' : 'Default ratings are now hidden')
      })
      .catch((e) => toast.error(e.message || 'Could not update setting'))
      .finally(() => setSavingSetting(false))
  }

  const setReview = (id, patch) => {
    api.patch(`/admin/reviews/${id}`, patch)
      .then(() => {
        toast.success('Review updated')
        load({ silent: true })
      })
      .catch((e) => toast.error(e.message || 'Could not update review'))
  }

  const remove = (r) => {
    if (!window.confirm(`Delete review from ${r.name}? This cannot be undone.`)) return
    api.del(`/admin/reviews/${r.id}`)
      .then(() => {
        toast.success('Review deleted')
        load({ silent: true })
      })
      .catch((e) => toast.error(e.message || 'Could not delete review'))
  }

  const allSelected = reviews.length > 0 && selected.length === reviews.length
  const toggleSelectAll = () => setSelected(allSelected ? [] : reviews.map((r) => r.id))
  const toggleSelect = (id) => setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]))

  const bulkAction = (action, label, confirmText) => {
    if (selected.length === 0) return toast.error('Select at least one review first')
    if (confirmText && !window.confirm(confirmText)) return
    setBulkBusy(true)
    api.post('/admin/reviews/bulk', { ids: selected, action })
      .then((d) => {
        toast.success(`${label}: ${d.count} review(s)`)
        setSelected([])
        load({ silent: true })
      })
      .catch((e) => toast.error(e.message || 'Could not update reviews'))
      .finally(() => setBulkBusy(false))
  }

  const tabs = [
    { key: '', label: 'All' },
    { key: 'pending', label: `Pending (${counts.pending || 0})` },
    { key: 'approved', label: `Approved (${counts.approved || 0})` },
    { key: 'hidden', label: `Hidden (${counts.hidden || 0})` },
    { key: 'rejected', label: `Rejected (${counts.rejected || 0})` },
  ]

  return (
    <div>
      <div className="section-title">
        <h2>Product Reviews</h2>
      </div>

      {/* Rating fallback setting */}
      <div className="table-wrap" style={{ marginBottom: 16, padding: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <strong style={{ fontSize: 14 }}>Show default rating when there are no reviews yet</strong>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            When off, products with no approved reviews show no rating at all. Turn it on to display each product's pre-set rating until real reviews arrive.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: showDefaultRating ? 'var(--primary)' : 'var(--muted)' }}>
            {showDefaultRating ? 'On' : 'Off'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={showDefaultRating}
            onClick={toggleDefaultRating}
            disabled={savingSetting}
            style={{
              width: 46,
              height: 26,
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              background: showDefaultRating ? 'var(--primary)' : '#cbd5e1',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
            title={showDefaultRating ? 'Click to hide default ratings' : 'Click to show default ratings'}
          >
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: showDefaultRating ? 23 : 3,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                transition: 'left 0.2s',
              }}
            />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {tabs.map((t) => (
          <button
            key={t.key || 'all'}
            className="btn"
            style={{
              background: status === t.key ? 'var(--primary)' : 'var(--card)',
              color: status === t.key ? '#fff' : 'var(--ink)',
              border: '1px solid var(--border)',
            }}
            onClick={() => setStatus(t.key)}
          >
            {t.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <input
            type="search"
            placeholder="Search reviews…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }}
          />
          <button className="btn" onClick={doSearch}>Search</button>
        </div>
      </div>

      {/* Bulk actions */}
      {reviews.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: 16, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
            Select all ({reviews.length})
          </label>
          {selected.length > 0 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{selected.length} selected</span>}
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => bulkAction('approved', 'Activated')} disabled={bulkBusy || selected.length === 0}>
              ✓ Activate selected
            </button>
            <button className="btn" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => bulkAction('hidden', 'Hidden')} disabled={bulkBusy || selected.length === 0}>
              Hide selected
            </button>
            <button className="btn" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => bulkAction('rejected', 'Rejected')} disabled={bulkBusy || selected.length === 0}>
              Reject selected
            </button>
            <button className="btn btn-danger" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => bulkAction('delete', 'Deleted', `Delete ${selected.length} selected review(s)? This cannot be undone.`)} disabled={bulkBusy || selected.length === 0}>
              Delete selected
            </button>
            {selected.length > 0 && (
              <button className="btn" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => setSelected([])} disabled={bulkBusy}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}></th>
              <th>Product</th>
              <th>Customer</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32 }}>
                <div className="loading"><div className="spinner" /> Loading reviews...</div>
              </td></tr>
            ) : reviews.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                No reviews here.
              </td></tr>
            ) : reviews.map((r) => {
              const meta = STATUS_META[r.status] || STATUS_META.pending
              return (
                <tr key={r.id} style={{ background: selected.includes(r.id) ? '#f0f7ff' : undefined }}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      title="Select for bulk action"
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
                      {r.productImage && (
                        <img src={r.productImage} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, background: '#f3f4f6', flexShrink: 0 }} />
                      )}
                      <strong style={{ fontSize: 13 }}>{r.productName}</strong>
                    </div>
                  </td>
                  <td>
                    <div style={{ minWidth: 140, fontSize: 13 }}>
                      <div>{r.customerName}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {r.verified && (
                          <span style={{ fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#166534', padding: '1px 7px', borderRadius: 999 }}>✓ Verified</span>
                        )}
                        {r.featured && (
                          <span style={{ fontSize: 11, fontWeight: 600, background: '#fef9c3', color: '#854d0e', padding: '1px 7px', borderRadius: 999 }}>★ Featured</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ color: '#f5a623', fontSize: 13, letterSpacing: 1, whiteSpace: 'nowrap' }}>
                      {'★'.repeat(Math.max(1, Math.min(5, Math.round(r.rating))))} <span style={{ color: 'var(--muted)', fontWeight: 700 }}>{r.rating}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ maxWidth: 260, minWidth: 180 }}>
                      <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, wordBreak: 'break-word' }}>{r.comment}</p>
                      {r.images && r.images.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          {r.images.map((img, i) => (
                            <a key={i} href={img} target="_blank" rel="noreferrer">
                              <img src={img} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, padding: '2px 9px', borderRadius: 999, fontWeight: 700, whiteSpace: 'nowrap', background: meta.bg, color: meta.color }}>
                      {meta.label}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minWidth: 210 }}>
                      {r.status !== 'approved' && (
                        <button className="btn btn-primary" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => setReview(r.id, { status: 'approved' })}>
                          Approve
                        </button>
                      )}
                      {r.status !== 'hidden' && (
                        <button className="btn" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => setReview(r.id, { status: 'hidden' })}>
                          Hide
                        </button>
                      )}
                      {r.status !== 'rejected' && (
                        <button className="btn" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => setReview(r.id, { status: 'rejected' })}>
                          Reject
                        </button>
                      )}
                      <button className="btn" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => setReview(r.id, { featured: !r.featured })}>
                        {r.featured ? 'Unfeature' : 'Feature'}
                      </button>
                      <button className="btn btn-danger" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => remove(r)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
