import axios from 'axios'

const getBaseURL = () => {
  // In production (Vercel), use the environment variable
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl) {
    const normalized = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl
    if (normalized.endsWith('/api')) return normalized
    return `${normalized}/api`
  }
  // In development or if env var not set, use relative path (with Vite proxy)
  return '/api'
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle auth errors globally
api.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status
    const code = err.response?.data?.code

    if (status === 401) {
      // Token expired or invalid — clear and redirect to login
      localStorage.removeItem('token')
      window.location.href = '/login'
    } else if (status === 403 && code === 'EMAIL_NOT_VERIFIED') {
      // Redirect to the email verification notice page
      window.location.href = '/verify-email'
    }

    return Promise.reject(err)
  }
)

export default api
