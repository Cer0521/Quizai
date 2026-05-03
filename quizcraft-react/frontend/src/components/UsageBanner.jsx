import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function UsageBanner() {
  const { user } = useAuth()
  if (!user || user.plan === 'unlimited') return null
  const limit = user.plan_limits?.quizzesPerMonth || 3
  const used = user.quizzes_used_this_month || 0
  const remaining = limit - used
  if (remaining > 1) return null

  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center justify-between mb-6 ${remaining === 0 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
      <div>
        <p className={`text-sm font-medium ${remaining === 0 ? 'text-red-800' : 'text-yellow-800'}`}>
          {remaining === 0 ? "You've used all your quizzes this month." : `Only ${remaining} quiz left this month.`}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">Upgrade to generate more quizzes immediately.</p>
      </div>
      <Link to="/pricing" className="btn-primary text-xs whitespace-nowrap ml-4">Upgrade now</Link>
    </div>
  )
}
