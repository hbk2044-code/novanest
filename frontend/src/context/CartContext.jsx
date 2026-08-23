import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { api } from '../api.js'
import { useAuth } from './AuthContext.jsx'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [cart, setCart] = useState({ items: [], subtotal: 0, count: 0 })

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/cart')
      setCart(data)
    } catch (e) {
      if (e.status !== 401) setCart({ items: [], subtotal: 0, count: 0 })
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, user])

  const addToCart = useCallback(async (productId, quantity = 1) => {
    const data = await api.post('/cart/add', { productId, quantity })
    setCart(data)
    return data
  }, [])

  const updateQty = useCallback(async (itemId, quantity) => {
    const data = await api.put(`/cart/${itemId}`, { quantity })
    setCart(data)
    return data
  }, [])

  const removeItem = useCallback(async (itemId) => {
    const data = await api.del(`/cart/${itemId}`)
    setCart(data)
    return data
  }, [])

  const clearCart = useCallback(async () => {
    await api.del('/cart')
    setCart({ items: [], subtotal: 0, count: 0 })
  }, [])

  const checkout = useCallback(async (payload) => {
    const data = await api.post('/orders/checkout', payload)
    setCart({ items: [], subtotal: 0, count: 0 })
    return data.order
  }, [])

  return (
    <CartContext.Provider
      value={{ cart, refresh, addToCart, updateQty, removeItem, clearCart, checkout }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
