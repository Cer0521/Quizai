import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GuestLayout from '../../components/GuestLayout'
import { useAuth } from '../../contexts/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '', role: 'student' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    try {
      const data = await register(form.name, form.email, form.password, form.password_confirmation, form.role)
      navigate(data.user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard')
    } catch (err) {
      setErrors(err.response?.data?.errors || { general: ['Something went wrong.'] })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GuestLayout>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">{errors.general[0]}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700">I am a...</label>
          <div className="mt-1 grid grid-cols-2 gap-3">
            {['teacher', 'student'].map(r => (
              <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
                className={`py-2 rounded-lg border-2 font-semibold text-sm capitalize transition ${form.role === r ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {r === 'teacher' ? '👩‍🏫 Teacher' : '👨‍🎓 Student'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-red-500" required autoFocus />
          {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name[0]}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-red-500" required />
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email[0]}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-red-500" required />
          {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password[0]}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
          <input type="password" value={form.password_confirmation} onChange={e => setForm({ ...form, password_confirmation: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-red-500" required />
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
