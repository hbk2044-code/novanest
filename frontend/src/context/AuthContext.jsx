import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { api } from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('novanest_user')
      return raw ? JSON.parse(raw) : null
    } catch (e) {
      return null
    }
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      api.get('/auth/me')
        .then((data) => setUser(data.user))
        .catch(() => logout())
    }
  }, [])

  const setSession = useCallback((token, u) => {
    localStorage.setItem('novanest_token', token)
    localStorage.setItem('novanest_user', JSON.stringify(u))
    setUser(u)
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password }, { auth: false })
    setSession(data.token, data.user)
    return data.user
  }, [setSession])

  const signup = useCallback(async (payload) => {
    const data = await api.post('/auth/signup', payload, { auth: false })
    setSession(data.token, data.user)
    return data.user
  }, [setSession])

  const logout = useCallback(() => {
    localStorage.removeItem('novanest_token')
    localStorage.removeItem('novanest_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, login, signup, logout, loading, setLoading }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
