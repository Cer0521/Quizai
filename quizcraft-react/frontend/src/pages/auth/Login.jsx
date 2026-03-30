import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GuestLayout from '../../components/GuestLayout'
import { useAuth } from '../../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', remember: false })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    try {
      const data = await login(form.email, form.password)
      // Route to correct dashboard based on role
      navigate(data.user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      // Better error handling
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors)
      } else if (err.response?.data?.message) {
        setErrors({ general: [err.response.data.message] })
      } else if (err.response?.status === 500) {
        setErrors({ general: ['Server error. Please check if the backend is running and database is connected.'] })
      } else if (err.response?.status === 422) {
        setErrors(err.response.data.errors || { general: ['Invalid credentials.'] })
      } else if (!err.response) {
        setErrors({ general: ['Cannot connect to server. Please check if the backend is running.'] })
      } else {
        setErrors({ general: ['Something went wrong. Please try again.'] })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GuestLayout>
      {errors.general && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
          {errors.general[0]}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-red-500"
            required autoFocus
          />
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email[0]}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-red-500"
            required
          />
          {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password[0]}</p>}
        </div>

        <div>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={e => setForm({ ...form, remember: e.target.checked })}
              className="rounded border-gray-300 text-red-600 shadow-sm focus:ring-red-500"
            />
            <span className="ms-2 text-sm text-gray-600">Remember me</span>
          </label>
        </div>

        <div className="flex items-center justify-end mt-4 gap-3">
          <Link to="/forgot-password" className="underline text-sm text-gray-600 hover:text-gray-900">
            Forgot your password?
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-gray-800 text-white text-sm font-bold rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-600 mt-2">
          Don't have an account?{' '}
          <Link to="/register" className="underline hover:text-gray-900">Register</Link>
        </p>
      </form>
    </GuestLayout>
  )
}
