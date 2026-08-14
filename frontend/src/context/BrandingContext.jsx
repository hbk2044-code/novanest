import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../api.js'

const DEFAULT_BRANDING = {
  appName: 'NovaNest',
  tagline: 'Everything Nepal Needs, One Nest.',
  logo: '',
  icon: '🛍️',
}

const DEFAULT_FAVICON = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>🛍️</text></svg>"

const BrandingContext = createContext(null)

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING)
  const [ready, setReady] = useState(false)

  const load = useCallback(() => {
    api.get('/settings/branding', { auth: false })
      .then((d) => setBranding({ ...DEFAULT_BRANDING, ...(d.branding || {}) }))
      .catch(() => setBranding(DEFAULT_BRANDING))
      .finally(() => setReady(true))
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!ready) return
    document.title = `${branding.appName || 'NovaNest'} - Online Marketplace Nepal`
    const favicon = document.querySelector("link[rel='icon']")
    if (favicon) {
      favicon.href = branding.logo || DEFAULT_FAVICON
    }
  }, [branding, ready])

  const value = { branding, ready, reload: load }
  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  return useContext(BrandingContext)
}
