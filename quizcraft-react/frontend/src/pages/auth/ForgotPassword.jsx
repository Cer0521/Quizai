import { useState } from 'react'
import { Link } from 'react-router-dom'
import GuestLayout from '../../components/GuestLayout'
import api from '../../api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    try {
      const res = await api.post('/auth/forgot-password', { email })
      setStatus(res.data.status)
    } catch (err) {
      setErrors(err.response?.data?.errors || { general: ['Something went wrong.'] })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GuestLayout>
      <p className="mb-4 text-sm text-gray-600">
        Forgot your password? Enter your email and we'll send you a reset link.
      </p>

      {status && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-sm">
          {status}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-red-500"
            required autoFocus
          />
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email[0]}</p>}
        </div>

        <div className="flex items-center justify-between mt-4">
          <Link to="/login" className="underline text-sm text-gray-600 hover:text-gray-900">Back to login</Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-gray-800 text-white text-sm font-bold rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Sending...' : 'Email Password Reset Link'}
          </button>
        </div>
      </form>
    </GuestLayout>
  )
}
