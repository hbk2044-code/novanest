import { useEffect, useRef, useState } from 'react'
import { formatPrice } from '../api.js'

export default function ProductPicker({ products, value, onChange, placeholder = 'Search and select a product...', onCreateNew }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef(null)
  const inputRef = useRef(null)

  const selected = products.find((p) => String(p.id) === String(value)) || null

  const q = query.trim().toLowerCase()
  const filtered = q
    ? products.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.categoryName || p.categorySlug || '').toLowerCase().includes(q)
      )
    : products

  const exactMatch = q ? products.some((p) => (p.name || '').toLowerCase() === q) : true
  const canCreate = onCreateNew && q && !exactMatch

  const totalRows = filtered.length + (canCreate ? 1 : 0)

  useEffect(() => {
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    setHighlight(0)
  }, [query])

  const pick = (p) => {
    onChange(String(p.id))
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const createNew = () => {
    setOpen(false)
    onCreateNew && onCreateNew(query.trim())
  }

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, totalRows - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (canCreate && highlight === filtered.length) {
        createNew()
      } else if (filtered[highlight]) {
        pick(filtered[highlight])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="product-picker" ref={rootRef}>
      <input
        ref={inputRef}
        type="text"
        value={open ? query : selected ? selected.name : query}
        placeholder={placeholder}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
        className="product-picker-input"
        autoComplete="off"
      />
      {open && (
        <div className="product-picker-menu">
          {filtered.length === 0 && !canCreate && <div className="product-picker-empty">No products found</div>}
          {filtered.map((p, i) => (
            <div
              key={p.id}
              className={`product-picker-item ${i === highlight ? 'active' : ''}`}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(p)
              }}
            >
              <div className="pp-name">
                {p.name}
                {p.sku && <span className="pp-sku">{p.sku}</span>}
              </div>
              <div className="pp-meta">
                <span className="pp-price">{formatPrice(p.price)}</span>
                <span className="pp-stock">Stock: {p.stock}</span>
              </div>
            </div>
          ))}
          {canCreate && (
            <div
              className={`product-picker-item pp-create ${highlight === filtered.length ? 'active' : ''}`}
              onMouseEnter={() => setHighlight(filtered.length)}
              onMouseDown={(e) => {
                e.preventDefault()
                createNew()
              }}
            >
              <div className="pp-name">
                <span className="pp-create-icon">+</span> Create new product: {query.trim()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
