import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL,
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    if (status === 401) {
      const url = err.config?.url || ''
      // Don't redirect for initial auth check — let pages show login state
      if (!url.includes('/auth/me')) {
        localStorage.removeItem('token')
        if (!window.location.pathname.includes('/login') && window.location.pathname !== '/register' && window.location.pathname !== '/') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

export const getErrorMessage = (err, fallback = 'Something went wrong') => {
  return err?.response?.data?.message || err?.message || fallback
}

export default api
