import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import api from '../../api'
import { useAuth } from '../../contexts/AuthContext'

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

export default function TeacherDashboard() {
  const { canAccessFeature } = useAuth()
  const [stats, setStats] = useState(null)
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const canUseAnalytics = canAccessFeature('analytics_dashboard')

  const loadData = () => {
    setLoading(true)
    Promise.all([api.get('/dashboard/stats'), api.get('/quizzes')])
      .then(([s, q]) => {
        setStats(s.data)
        // Filter for published quizzes first, then take top 5
        const publishedQuizzes = (q.data.quizzes || []).filter(quiz => quiz.is_published)
        setQuizzes(publishedQuizzes.slice(0, 5))
      })
      .catch(err => {
        console.error('Dashboard load error:', err)
        // Show user-friendly error
        if (err.response?.status === 401) {
          // Will be handled by axios interceptor
        } else {
          alert('Failed to load dashboard data. Please refresh the page.')
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <AppLayout header={
      <div className="flex justify-between items-center w-full">
        <h2 className="text-xl font-bold text-gray-800">Teacher Dashboard</h2>
        <button onClick={loadData} className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
          <span className={loading ? 'animate-spin' : ''}>⟳</span> Refresh
        </button>
      </div>
    }>
      {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" /></div> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Quizzes" value={stats?.total_quizzes ?? 0} color="text-blue-600" icon="📋" />
            <StatCard label="Published" value={stats?.published_quizzes ?? 0} color="text-green-600" icon="✅" />
            <StatCard label="Assignments" value={stats?.total_assignments ?? 0} color="text-purple-600" icon="📎" />
            <StatCard label="Avg Score" value={`${stats?.average_score ?? 0}%`} color="text-orange-600" icon="🎯" />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Published Quizzes</h3>
              <div className="flex gap-2">
                <Link to="/teacher/quizzes/generate" className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition">✨ Generate with AI</Link>
              </div>
            </div>

            {quizzes.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-4xl mb-3">📝</p>
                <p>No published quizzes yet.</p>
                <Link to="/teacher/quizzes" className="text-red-600 hover:underline text-sm mt-2 inline-block">View all quizzes →</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-500 uppercase border-b">
                    <th className="pb-2 pr-4">Title</th>
                    <th className="pb-2 pr-4">Questions</th>
                    <th className="pb-2 pr-4">Assigned</th>
                    <th className="pb-2 pr-4">Completed</th>
                    <th className="pb-2">Actions</th>
                  </tr></thead>
                  <tbody>
                    {quizzes.map(q => (
                      <tr key={q.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 pr-4 font-medium text-gray-800">{q.title}</td>
                        <td className="py-3 pr-4 text-gray-500">{q.total_questions}</td>
                        <td className="py-3 pr-4 text-gray-500">{q.assigned_count} students</td>
                        <td className="py-3 pr-4">
                          <span className="text-gray-700 font-semibold">{q.total_completed || 0}</span>
                          <span className="text-gray-400 text-xs ml-1">attempts</span>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <Link to={`/teacher/quizzes/${q.id}/edit`} className="text-xs text-blue-600 hover:underline">Edit</Link>
                            <Link to={`/teacher/quizzes/${q.id}/assign`} className="text-xs text-green-600 hover:underline">Assign</Link>
                            {canUseAnalytics
                              ? <Link to={`/teacher/quizzes/${q.id}/analytics`} className="text-xs text-purple-600 hover:underline">Analytics</Link>
                              : <Link to="/pricing" className="text-xs text-amber-600 hover:underline">🔒 Analytics</Link>
                            }
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Link to="/teacher/quizzes" className="block mt-4 text-sm text-red-600 hover:underline text-center">View all quizzes →</Link>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
