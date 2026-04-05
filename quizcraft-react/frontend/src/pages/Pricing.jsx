import { useState } from 'react'
import AppLayout from '../components/AppLayout'
import { useAuth } from '../contexts/AuthContext'
import { PLAN, PLAN_LABELS } from '../utils/subscription'
import api from '../api'

const PLANS = [
  {
    key: PLAN.FREE,
    price: '\u20b10/month',
    subtitle: 'For starters',
    highlights: [
      'Max 5 quizzes every 14 days',
      'Basic quiz formats only',
      'Ads enabled',
    ],
  },
  {
    key: PLAN.PRO,
    price: '\u20b1280/month',
    subtitle: 'For power teachers',
    highlights: [
      'Unlimited quizzes',
      'All quiz formats + blueprinting',
      'Analytics dashboard',
      'No ads',
    ],
    featured: true,
  },
  {
    key: PLAN.TEAM,
    price: '\u20b128,000/year',
    subtitle: 'For schools and orgs',
    highlights: [
      'All Pro features',
      'Team management (invites, roles)',
      'LMS export (Canvas, Moodle)',
      'Priority support',
    ],
  },
]

export default function Pricing() {
  const { subscription, upgradeSubscription, refreshSubscription } = useAuth()
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteLink, setInviteLink] = useState('')

  const currentPlan = subscription?.plan || PLAN.FREE
  const effectivePlan = subscription?.effective_plan || currentPlan
  const usage = subscription?.quiz_limit == null
    ? 'Unlimited'
    : `${subscription?.quiz_count || 0}/${subscription?.quiz_limit || 5}`
  const isTeamOwner = subscription?.plan === PLAN.TEAM && subscription?.team_role === 'OWNER'
  const teamMembers = subscription?.team_members || []

  async function handleUpgrade(plan) {
    setBusy(plan)
    setMessage('')
    setError('')
    try {
      const res = await upgradeSubscription(plan)
      setMessage(res.message || `Upgraded to ${PLAN_LABELS[plan]}.`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upgrade subscription.')
    } finally {
      setBusy('')
    }
  }

  async function handleInvite(e) {
    e.preventDefault()
    setInviteBusy(true)
    setMessage('')
    setError('')
    setInviteLink('')
    try {
      const res = await api.post('/team/invite', { email: inviteEmail })
      setInviteLink(res.data?.invite?.join_url || '')
      setInviteEmail('')
      setMessage('Invite created successfully.')
      await refreshSubscription()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create invite.')
    } finally {
      setInviteBusy(false)
    }
  }

  return (
    <AppLayout header={<h2 className="text-xl font-bold text-gray-800">Subscription & Pricing</h2>}>
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Current Plan</p>
              <p className="text-2xl font-bold text-gray-900">{PLAN_LABELS[currentPlan]}</p>
              {effectivePlan !== currentPlan && (
                <p className="text-xs text-gray-500 mt-1">Effective access: {PLAN_LABELS[effectivePlan]}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-gray-500">Quiz Usage (14 days)</p>
              <p className="text-lg font-semibold text-gray-800">{usage}</p>
              <p className="text-xs text-gray-500 mt-1">Ads: {subscription?.ads_visible ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
          {message && <p className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{message}</p>}
          {error && <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map(plan => {
            const isCurrent = currentPlan === plan.key
            return (
              <div
                key={plan.key}
                className={`rounded-2xl border p-5 shadow-sm bg-white flex flex-col ${plan.featured ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200'}`}
              >
                <p className="text-xs uppercase tracking-wide text-gray-500">{plan.subtitle}</p>
                <h3 className="text-xl font-bold text-gray-900 mt-1">{PLAN_LABELS[plan.key]}</h3>
                <p className="text-2xl font-extrabold text-gray-900 mt-3">{plan.price}</p>

                <ul className="mt-4 space-y-2 text-sm text-gray-700 flex-1">
                  {plan.highlights.map(item => (
                    <li key={item} className="flex gap-2">
                      <span className="text-green-600">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={isCurrent || busy === plan.key}
                  onClick={() => handleUpgrade(plan.key)}
                  className={`mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    isCurrent
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : plan.featured
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : busy === plan.key ? 'Updating...' : 'Upgrade'}
                </button>
              </div>
            )
          })}
        </div>

        {(isTeamOwner || teamMembers.length > 0) && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900">Team Management</h3>
              <p className="text-sm text-gray-500 mt-1">Invite teachers and share Pro-level access across your team.</p>

              {isTeamOwner ? (
                <form onSubmit={handleInvite} className="mt-4 space-y-3">
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="teacher@email.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    type="submit"
                    disabled={inviteBusy}
                    className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    {inviteBusy ? 'Sending Invite...' : 'Invite Teacher'}
                  </button>
                </form>
              ) : (
                <p className="mt-4 text-sm text-gray-600">You are a team member. Only owners can send invites.</p>
              )}

              {inviteLink && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs font-semibold text-blue-700">Invite Link</p>
                  <p className="text-xs text-blue-900 break-all mt-1">{inviteLink}</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
              {teamMembers.length === 0 ? (
                <p className="text-sm text-gray-500 mt-3">No team members yet.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {teamMembers.map(member => (
                    <div key={member.id} className="rounded-lg border border-gray-200 px-3 py-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${String(member.team_role).toUpperCase() === 'OWNER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {String(member.team_role).toUpperCase() === 'OWNER' ? 'Owner' : 'Member'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
