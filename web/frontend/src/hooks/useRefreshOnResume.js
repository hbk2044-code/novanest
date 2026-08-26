import { useEffect } from 'react'

// Refetches data whenever the app/window becomes visible again (e.g. resuming
// from background in the Capacitor app, or returning to the browser tab). This
// keeps product lists fresh after control-panel changes without a reinstall.
export default function useRefreshOnResume(refetch) {
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') refetch()
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [refetch])
}
