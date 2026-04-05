import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'
import { hasFeature, normalizePlan } from '../utils/subscription'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadSubscription() {
    try {
      const res = await api.get('/user/subscription')
      setSubscription(res.data.subscription)
      return res.data.subscription
    } catch {
      setSubscription(null)
      return null
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/auth/user')
        .then(async res => {
          setUser(res.data.user)
          await loadSubscription()
        })
        .catch(() => {
          localStorage.removeItem('token')
          setSubscription(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', res.data.token)
    setUser(res.data.user)
    await loadSubscription()
    return res.data
  }

  async function register(name, email, password, password_confirmation) {
    const res = await api.post('/auth/register', { name, email, password, password_confirmation })
    localStorage.setItem('token', res.data.token)
    setUser(res.data.user)
    await loadSubscription()
    return res.data
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => {})
    localStorage.removeItem('token')
    setUser(null)
    setSubscription(null)
  }

  function updateUser(updatedUser) { setUser(updatedUser) }

  async function upgradeSubscription(plan) {
    const normalizedPlan = normalizePlan(plan)
    const res = await api.post('/subscription/upgrade', { plan: normalizedPlan })
    setSubscription(res.data.subscription)
    setUser(prev => (prev ? { ...prev, plan: normalizedPlan } : prev))
    return res.data
  }

  function canAccessFeature(featureKey) {
    if (subscription?.features && Object.prototype.hasOwnProperty.call(subscription.features, featureKey)) {
      return Boolean(subscription.features[featureKey])
    }

    const plan = subscription?.effective_plan || subscription?.plan || user?.plan || 'FREE'
    return hasFeature(plan, featureKey)
  }

  const isTeacher = user?.role === 'teacher'
  const isStudent = user?.role === 'student'

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        subscription,
        login,
        register,
        logout,
        updateUser,
        upgradeSubscription,
        refreshSubscription: loadSubscription,
        canAccessFeature,
        isTeacher,
        isStudent,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
