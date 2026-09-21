import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('token')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.accessToken)
    try {
      const payload = JSON.parse(atob(data.accessToken.split('.')[1]))
      const role = payload.roles ? payload.roles[0] : (data.role || 'student')
      const loggedUser = { email, role, ...(data.user || {}) }
      setUser(loggedUser)
      return { ...data, role }
    } catch (e) {
      const fallback = { email, role: data.role || 'student', ...(data.user || {}) }
      setUser(fallback)
      return { ...data, role: fallback.role }
    }
  }

  const register = async (userData) => {
    const { data } = await api.post('/auth/register', userData)
    return data
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
