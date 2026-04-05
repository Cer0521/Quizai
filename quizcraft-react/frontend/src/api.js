import axios from 'axios'

const getBaseURL = () => {
  // In production (Vercel), use the environment variable if set.
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl) {
    const normalized = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl
    if (normalized.endsWith('/api')) return normalized
    return `${normalized}/api`
  }

  // Safety fallback for production deploys where VITE_API_URL was not injected.
  if (import.meta.env.PROD) {
    return 'https://quizai-1-ydi0.onrender.com/api'
  }

  // In local development, use relative path (with Vite proxy)
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
    const reqUrl = String(err.config?.url || '')
    const isSessionCheckRequest = reqUrl.includes('/auth/user') || reqUrl.includes('/auth/logout')

    if (status === 401 && isSessionCheckRequest) {
      // Clear session only when the backend rejects auth/session checks.
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
