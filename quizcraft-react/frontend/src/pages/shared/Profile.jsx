import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'

export default function Profile() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const [info, setInfo] = useState({ name: user?.name || '', email: user?.email || '' })
  const [pass, setPass] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [infoMsg, setInfoMsg] = useState('')
  const [passMsg, setPassMsg] = useState('')
  const [infoErr, setInfoErr] = useState({})
  const [passErr, setPassErr] = useState({})
  const [savingInfo, setSavingInfo] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')

  async function handleInfoSave(e) {
    e.preventDefault(); setSavingInfo(true); setInfoErr({}); setInfoMsg('')
    try {
      const res = await api.patch('/profile', info)
      updateUser(res.data.user)
      setInfoMsg('Profile updated successfully.')
    } catch (err) { setInfoErr(err.response?.data?.errors || {}) }
    finally { setSavingInfo(false) }
  }

  async function handlePassSave(e) {
    e.preventDefault(); setSavingPass(true); setPassErr({}); setPassMsg('')
    try {
      await api.put('/profile/password', pass)
      setPassMsg('Password updated successfully.')
      setPass({ current_password: '', password: '', password_confirmation: '' })
    } catch (err) { setPassErr(err.response?.data?.errors || {}) }
    finally { setSavingPass(false) }
  }

  async function handleDelete() {
    if (deleteInput !== 'DELETE') return
    await api.delete('/profile')
    await logout()
    navigate('/')
  }

  return (
    <AppLayout header={<h2 className="text-xl font-bold text-gray-800">Profile Settings</h2>}>
      <div className="max-w-xl mx-auto space-y-5">
        {/* Profile info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Profile Information</h3>
          {infoMsg && <p className="text-green-600 text-sm mb-3 bg-green-50 px-3 py-2 rounded-lg">{infoMsg}</p>}
          <form onSubmit={handleInfoSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input value={info.name} onChange={e => setInfo({ ...info, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500" />
              {infoErr.name && <p className="text-red-500 text-xs mt-1">{infoErr.name[0]}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={info.email} onChange={e => setInfo({ ...info, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500" />
              {infoErr.email && <p className="text-red-500 text-xs mt-1">{infoErr.email[0]}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <p className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg capitalize">{user?.role}</p>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={savingInfo}
                className="px-4 py-2 bg-gray-800 text-white text-sm font-bold rounded-lg hover:bg-gray-700 disabled:opacity-50 transition">
                {savingInfo ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Change password */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Update Password</h3>
          {passMsg && <p className="text-green-600 text-sm mb-3 bg-green-50 px-3 py-2 rounded-lg">{passMsg}</p>}
          <form onSubmit={handlePassSave} className="space-y-4">
            {['current_password', 'password', 'password_confirmation'].map((field, i) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {['Current Password', 'New Password', 'Confirm Password'][i]}
                </label>
                <input type="password" value={pass[field]} onChange={e => setPass({ ...pass, [field]: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500" />
                {passErr[field === 'current_password' ? 'current_password' : 'password'] && i > 0 &&
                  <p className="text-red-500 text-xs mt-1">{passErr.password?.[0]}</p>}
              </div>
            ))}
            <div className="flex justify-end">
              <button type="submit" disabled={savingPass}
                className="px-4 py-2 bg-gray-800 text-white text-sm font-bold rounded-lg hover:bg-gray-700 disabled:opacity-50 transition">
                {savingPass ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Delete account */}
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6">
          <h3 className="font-semibold text-red-700 mb-2">Delete Account</h3>
          <p className="text-sm text-gray-500 mb-4">This action is permanent and cannot be undone.</p>
          {!showDelete
            ? <button onClick={() => setShowDelete(true)} className="px-4 py-2 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 transition">Delete Account</button>
            : <div className="space-y-3">
                <p className="text-sm text-gray-600">Type <strong>DELETE</strong> to confirm:</p>
                <input value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
                  className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:border-red-500" placeholder="DELETE" />
                <div className="flex gap-2">
                  <button onClick={() => { setShowDelete(false); setDeleteInput('') }}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                  <button onClick={handleDelete} disabled={deleteInput !== 'DELETE'}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 transition">Confirm Delete</button>
                </div>
              </div>
          }
        </div>
      </div>
    </AppLayout>
  )
}
