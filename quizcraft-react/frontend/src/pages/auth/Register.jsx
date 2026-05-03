import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GuestLayout from '../../components/GuestLayout'
import { useAuth } from '../../contexts/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const name = form.name.trim()
    const email = form.email.trim()
    const password = form.password
    const passwordConfirmation = form.password_confirmation

    if (!name || !email || !password) {
      setErrors({ general: ['All fields are required.'] })
      return
    }

    if (password.length < 8) {
      setErrors({ password: ['Password must be at least 8 characters.'] })
      return
    }

    if (password !== passwordConfirmation) {
      setErrors({ password_confirmation: ['Passwords do not match.'] })
      return
    }

    setSubmitting(true)
    setErrors({})
    try {
      await register(name, email, password, passwordConfirmation)
      navigate('/teacher/dashboard')
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors)
      } else if (err.response?.data?.message) {
        setErrors({ general: [err.response.data.message] })
      } else if (!err.response) {
        setErrors({ general: ['Cannot connect to server. Please check backend deployment.'] })
      } else {
        setErrors({ general: ['Something went wrong. Please try again.'] })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GuestLayout title="Start studying smarter" subtitle="Free plan — no credit card required">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{errors.general[0]}</div>}

        <div>
          <label htmlFor="register-name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input id="register-name" name="name" type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            autoComplete="name"
            className="input" required autoFocus />
          {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name[0]}</p>}
        </div>

        <div>
          <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input id="register-email" name="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
            className="input" required />
          {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email[0]}</p>}
        </div>

        <div>
          <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1">Password (min 8 chars)</label>
          <input id="register-password" name="password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
            className="input" required />
          {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password[0]}</p>}
        </div>

        <div>
          <label htmlFor="register-password-confirmation" className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
          <input id="register-password-confirmation" name="password_confirmation" type="password" value={form.password_confirmation} onChange={e => setForm({ ...form, password_confirmation: e.target.value })}
            autoComplete="new-password"
            className="input" required />
          {errors.password_confirmation && <p className="text-red-600 text-xs mt-1">{errors.password_confirmation[0]}</p>}
>>>>>>> Stashed changes
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full mt-2">
          {submitting ? 'Creating account...' : 'Create free account'}
        </button>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 hover:underline font-medium">Sign in</Link>
        </p>
      </form>
    </GuestLayout>
  )
}
