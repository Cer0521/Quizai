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
      setStatus(res.data.status || 'If that email exists, a reset link was sent.')
    } catch (err) {
      setErrors(err.response?.data?.errors || { general: ['Something went wrong.'] })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GuestLayout title="Reset password" subtitle="We'll send a reset link to your email">
      {status ? (
        <div className="text-center">
          <p className="text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm mb-4">{status}</p>
          <Link to="/login" className="text-sm text-brand-600 hover:underline">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{errors.general[0]}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              required autoFocus
            />
            {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email[0]}</p>}
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Sending...' : 'Send reset link'}
          </button>

          <p className="text-center text-sm"><Link to="/login" className="text-gray-500 hover:text-gray-700">Back to sign in</Link></p>
        </form>
      )}
    </GuestLayout>
  )
}
