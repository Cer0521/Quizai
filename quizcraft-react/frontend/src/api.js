import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
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
