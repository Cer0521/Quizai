import { useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import GuestLayout from '../../components/GuestLayout'
import api from '../../api'

export default function ResetPassword() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: searchParams.get('email') || '',
    password: '',
    password_confirmation: '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    try {
      await api.post('/auth/reset-password', { ...form, token })
      navigate('/login')
    } catch (err) {
      setErrors(err.response?.data?.errors || { general: ['Something went wrong.'] })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GuestLayout title="Set new password">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            {errors.general[0]}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="input"
            required
          />
          {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email[0]}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            className="input"
            required
          />
          {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password[0]}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
          <input
            type="password"
            value={form.password_confirmation}
            onChange={e => setForm({ ...form, password_confirmation: e.target.value })}
            className="input"
            required
          />
          {errors.password_confirmation && <p className="text-red-600 text-xs mt-1">{errors.password_confirmation[0]}</p>}
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
    </GuestLayout>
  )
}
