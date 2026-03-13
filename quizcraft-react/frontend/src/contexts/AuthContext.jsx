import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/auth/user')
        .then(res => setUser(res.data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', res.data.token)
    setUser(res.data.user)
    return res.data
  }

  async function register(name, email, password, password_confirmation, role) {
    const res = await api.post('/auth/register', { name, email, password, password_confirmation, role })
    localStorage.setItem('token', res.data.token)
    setUser(res.data.user)
    return res.data
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => {})
    localStorage.removeItem('token')
    setUser(null)
  }

  function updateUser(updatedUser) { setUser(updatedUser) }

  const isTeacher = user?.role === 'teacher'
  const isStudent = user?.role === 'student'

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, isTeacher, isStudent }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
