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
    <GuestLayout>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">{errors.general[0]}</div>}
        <p className="text-sm text-gray-600">Registration is currently enabled for teacher accounts only.</p>

        <div>
          <label htmlFor="register-name" className="block text-sm font-medium text-gray-700">Name</label>
          <input id="register-name" name="name" type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            autoComplete="name"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-red-500" required autoFocus />
          {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name[0]}</p>}
        </div>

        <div>
          <label htmlFor="register-email" className="block text-sm font-medium text-gray-700">Email</label>
          <input id="register-email" name="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-red-500" required />
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email[0]}</p>}
        </div>

        <div>
          <label htmlFor="register-password" className="block text-sm font-medium text-gray-700">Password</label>
          <input id="register-password" name="password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-red-500" required />
          {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password[0]}</p>}
        </div>

        <div>
          <label htmlFor="register-password-confirmation" className="block text-sm font-medium text-gray-700">Confirm Password</label>
          <input id="register-password-confirmation" name="password_confirmation" type="password" value={form.password_confirmation} onChange={e => setForm({ ...form, password_confirmation: e.target.value })}
            autoComplete="new-password"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-red-500" required />
          {errors.password_confirmation && <p className="text-red-600 text-sm mt-1">{errors.password_confirmation[0]}</p>}
        </div>

        <div className="flex items-center justify-end mt-4 gap-3">
          <Link to="/login" className="underline text-sm text-gray-600 hover:text-gray-900">Already registered?</Link>
          <button type="submit" disabled={submitting}
            className="px-4 py-2 bg-gray-800 text-white text-sm font-bold rounded-md hover:bg-gray-700 disabled:opacity-50 transition">
            {submitting ? 'Registering...' : 'Register'}
          </button>
        </div>
      </form>
    </GuestLayout>
  )
}
