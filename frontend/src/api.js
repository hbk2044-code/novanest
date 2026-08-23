const API_BASE = '/api'

function getToken() {
  return localStorage.getItem('novanest_token') || ''
}

export function getGuestId() {
  let id = localStorage.getItem('novanest_guest_id')
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) ||
      `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem('novanest_guest_id', id)
  }
  return id
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Guest-Id': getGuestId(),
  }
  const token = getToken()
  if (auth && token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try {
    data = await res.json()
  } catch (e) {
    data = {}
  }
  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

// Multipart request (FormData) - no manual Content-Type so the browser sets the
// multipart boundary. Used for review images.
async function requestForm(path, { method = 'POST', body, auth = true } = {}) {
  const headers = { 'X-Guest-Id': getGuestId() }
  const token = getToken()
  if (auth && token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body,
  })
  let data = null
  try {
    data = await res.json()
  } catch (e) {
    data = {}
  }
  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

async function uploadImage(file, folder = 'products') {
  const fd = new FormData()
  fd.append('folder', folder)
  fd.append('image', file)
  const res = await fetch(`${API_BASE}/admin/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: fd,
  })
  let data = null
  try {
    data = await res.json()
  } catch (e) {
    data = {}
  }
  if (!res.ok) {
    const err = new Error(data.message || 'Image upload failed')
    err.status = res.status
    throw err
  }
  return data.url
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  postForm: (path, body, opts) => requestForm(path, { ...opts, method: 'POST', body }),
  putForm: (path, body, opts) => requestForm(path, { ...opts, method: 'PUT', body }),
  uploadImage,
}

export function formatPrice(value) {
  const num = Number(value) || 0
  return `Rs. ${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const CATEGORY_GRADIENTS = {
  food: 'linear-gradient(135deg, #ffedd5, #fed7aa)',
  groceries: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
  clothes: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
  'cooked-food': 'linear-gradient(135deg, #fee2e2, #fecaca)',
  cosmetics: 'linear-gradient(135deg, #fce7f3, #fbcfe8)',
  'used-electronics': 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
}

export function categoryGradient(slug) {
  return CATEGORY_GRADIENTS[slug] || 'linear-gradient(135deg, #f3f4f6, #e5e7eb)'
}

const CATEGORY_ICONS = {
  food: '🍜',
  groceries: '🛒',
  clothes: '👕',
  'cooked-food': '🍛',
  cosmetics: '💄',
  'used-electronics': '📱',
}

export function categoryIcon(slug) {
  return CATEGORY_ICONS[slug] || '🛍️'
}
