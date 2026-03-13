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
    <GuestLayout>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
            {errors.general[0]}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-red-500"
            required
          />
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email[0]}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">New Password</label>
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
          <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
          <input
            type="password"
            value={form.password_confirmation}
            onChange={e => setForm({ ...form, password_confirmation: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-red-500"
            required
          />
        </div>

        <div className="flex justify-end mt-4">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-gray-800 text-white text-sm font-bold rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </form>
    </GuestLayout>
  )
}
