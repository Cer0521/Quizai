import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'

function UpdateProfileForm({ user, updateUser }) {
  const [form, setForm] = useState({ name: user.name, email: user.email })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    setStatus('')
    try {
      const res = await api.patch('/profile', form)
      updateUser(res.data.user)
      setStatus('Saved.')
      setTimeout(() => setStatus(''), 2000)
    } catch (err) {
      setErrors(err.response?.data?.errors || {})
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <header>
        <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
        <p className="mt-1 text-sm text-gray-600">Update your account's profile information and email address.</p>
      </header>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-red-500"
            required
          />
          {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name[0]}</p>}
        </div>

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
          {!user.email_verified_at && (
            <p className="text-sm mt-2 text-gray-800">Your email address is unverified.</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-gray-800 text-white text-sm font-bold rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
          {status && <p className="text-sm text-gray-600">{status}</p>}
        </div>
      </form>
    </section>
  )
}

function UpdatePasswordForm() {
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    setStatus('')
    try {
      await api.put('/profile/password', form)
      setForm({ current_password: '', password: '', password_confirmation: '' })
      setStatus('Saved.')
      setTimeout(() => setStatus(''), 2000)
    } catch (err) {
      setErrors(err.response?.data?.errors || {})
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <header>
        <h2 className="text-lg font-medium text-gray-900">Update Password</h2>
        <p className="mt-1 text-sm text-gray-600">Ensure your account is using a long, random password to stay secure.</p>
      </header>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Current Password</label>
          <input
            type="password"
            value={form.current_password}
            onChange={e => setForm({ ...form, current_password: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-red-500"
            required
          />
          {errors.current_password && <p className="text-red-600 text-sm mt-1">{errors.current_password[0]}</p>}
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

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-gray-800 text-white text-sm font-bold rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
          {status && <p className="text-sm text-gray-600">{status}</p>}
        </div>
      </form>
    </section>
  )
}

function DeleteAccountForm() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  async function handleDelete(e) {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    try {
      await api.delete('/profile', { data: { password } })
      await logout()
      navigate('/')
    } catch (err) {
      setErrors(err.response?.data?.errors || {})
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-medium text-gray-900">Delete Account</h2>
        <p className="mt-1 text-sm text-gray-600">
          Once your account is deleted, all of its resources and data will be permanently deleted. Before deleting your account, please download any data or information that you wish to retain.
        </p>
      </header>

      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-md hover:bg-red-700 transition"
      >
        Delete Account
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Are you sure you want to delete your account?</h2>
            <p className="mt-1 text-sm text-gray-600 mb-6">
              Once your account is deleted, all of its resources and data will be permanently deleted. Please enter your password to confirm.
            </p>

            <form onSubmit={handleDelete} className="space-y-4">
              <div>
                <label className="sr-only">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  className="mt-1 block w-3/4 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-red-500"
                  required
                />
                {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password[0]}</p>}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setPassword(''); setErrors({}) }}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-md hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-md hover:bg-red-700 disabled:opacity-50 transition"
                >
                  {submitting ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default function Profile() {
  const { user, updateUser } = useAuth()

  return (
    <AppLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Profile</h2>}>
      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
          <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
            <div className="max-w-xl">
              <UpdateProfileForm user={user} updateUser={updateUser} />
            </div>
          </div>

          <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
            <div className="max-w-xl">
              <UpdatePasswordForm />
            </div>
          </div>

          <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
            <div className="max-w-xl">
              <DeleteAccountForm />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
