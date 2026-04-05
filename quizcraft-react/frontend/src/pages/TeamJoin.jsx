import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import api from '../api'
import { useAuth } from '../contexts/AuthContext'

export default function TeamJoin() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { refreshSubscription } = useAuth()
  const [state, setState] = useState({ loading: true, error: '', success: '' })

  useEffect(() => {
    let active = true
    async function joinTeam() {
      try {
        const res = await api.post('/team/join', { token })
        await refreshSubscription()
        if (!active) return
        setState({ loading: false, error: '', success: res.data?.message || 'Joined team successfully.' })
      } catch (err) {
        if (!active) return
        setState({ loading: false, error: err.response?.data?.message || 'Unable to join team.', success: '' })
      }
    }

    joinTeam()
    return () => { active = false }
  }, [token, refreshSubscription])

  return (
    <AppLayout header={<h2 className="text-xl font-bold text-gray-800">Team Invitation</h2>}>
      <div className="max-w-xl mx-auto bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
        {state.loading && <p className="text-sm text-gray-600">Joining team...</p>}
        {state.error && <p className="text-sm text-red-700">{state.error}</p>}
        {state.success && <p className="text-sm text-green-700">{state.success}</p>}

        <button
          type="button"
          onClick={() => navigate('/pricing')}
          className="mt-5 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700"
        >
          Go to Pricing
        </button>
      </div>
    </AppLayout>
  )
}
