import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import api from '../../api'

function StatCard({ label, value, color, icon }) {
  return (
    <div className={`bg-white rounded-xl p-5 border border-gray-100 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}

function SubscriptionCard({ subscription }) {
  const tierColors = {
    free: 'bg-gray-100 text-gray-700',
    premium: 'bg-blue-100 text-blue-700',
    enterprise: 'bg-purple-100 text-purple-700'
  }

  const tierLimits = {
    free: { quizzes: 5, period: '14 days' },
    premium: { quizzes: 'Unlimited', period: 'month' },
    enterprise: { quizzes: 'Unlimited', period: 'unlimited' }
  }

  const limits = tierLimits[subscription.tier] || tierLimits.free

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Current Plan</p>
          <h3 className="text-2xl font-bold text-gray-800 capitalize">{subscription.tier}</h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${tierColors[subscription.tier]}`}>
          {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
        </span>
      </div>
      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-600">
          <strong>Quiz Limit:</strong> {limits.quizzes} per {limits.period}
        </p>
        {subscription.tier === 'free' && (
          <p className="text-sm text-gray-600">
            <strong>Used:</strong> {subscription.quiz_count_this_period} / 5 quizzes
          </p>
        )}
        {subscription.referral_code && (
          <p className="text-sm text-gray-600">
            <strong>Referral Code:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{subscription.referral_code}</code>
          </p>
        )}
      </div>
      {subscription.tier === 'free' && (
        <Link to="/pricing" className="block w-full text-center px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition">
          Upgrade to Premium
        </Link>
      )}
    </div>
  )
}

export default function TeacherDashboard() {
  const [stats, setStats] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/dashboard/stats'),
      api.get('/api/quizzes'),
      api.get('/api/subscription')
    ])
      .then(([s, q, sub]) => {
        setStats(s.data)
        setQuizzes(q.data.quizzes?.slice(0, 5) || [])
        setSubscription(sub.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout header={<h2 className="text-xl font-bold text-gray-800">Teacher Dashboard</h2>}>
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Subscription Card */}
          {subscription && <SubscriptionCard subscription={subscription} />}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Quizzes" value={stats?.total_quizzes ?? 0} color="text-blue-600" icon="📋" />
            <StatCard label="Total Attempts" value={stats?.total_attempts ?? 0} color="text-green-600" icon="📊" />
            <StatCard label="Average Score" value={`${stats?.average_score ?? 0}%`} color="text-purple-600" icon="🎯" />
            <StatCard label="Students" value={stats?.total_students ?? 0} color="text-orange-600" icon="👥" />
          </div>

          {/* Recent Quizzes */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Recent Quizzes</h3>
              <div className="flex gap-2">
                <Link to="/teacher/quizzes/generate" className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition">✨ Generate with AI</Link>
                <Link to="/teacher/quizzes/create" className="px-3 py-1.5 text-xs font-bold bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition">+ Manual</Link>
              </div>
            </div>

            {quizzes.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-4xl mb-3">📝</p>
                <p>No quizzes yet. Create your first one!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase border-b">
                      <th className="pb-2 pr-4">Title</th>
                      <th className="pb-2 pr-4">Questions</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizzes.map(q => (
                      <tr key={q.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 pr-4 font-medium text-gray-800">{q.title}</td>
                        <td className="py-3 pr-4 text-gray-500">{q.total_questions}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${q.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {q.is_published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <Link to={`/teacher/quizzes/${q.id}/edit`} className="text-xs text-blue-600 hover:underline">Edit</Link>
                            <Link to={`/teacher/quizzes/${q.id}/analytics`} className="text-xs text-purple-600 hover:underline">Analytics</Link>
                            {q.share_code && (
                              <Link to={`/guest/quiz/${q.share_code}`} className="text-xs text-green-600 hover:underline" target="_blank">
                                Share
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {quizzes.length > 0 && (
              <Link to="/teacher/quizzes" className="block mt-4 text-sm text-red-600 hover:underline text-center">
                View all quizzes →
              </Link>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  )
}
