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

export default function TeacherDashboard() {
  const [stats, setStats] = useState(null)
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/dashboard/stats'), api.get('/quizzes')])
      .then(([s, q]) => { setStats(s.data); setQuizzes(q.data.quizzes.slice(0, 5)) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout header={<h2 className="text-xl font-bold text-gray-800">Teacher Dashboard</h2>}>
      {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" /></div> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Quizzes" value={stats?.total_quizzes ?? 0} color="text-blue-600" icon="📋" />
            <StatCard label="Total Students" value={stats?.total_students ?? 0} color="text-green-600" icon="👥" />
            <StatCard label="Assignments" value={stats?.total_assignments ?? 0} color="text-purple-600" icon="📎" />
            <StatCard label="Avg Score" value={`${stats?.average_score ?? 0}%`} color="text-orange-600" icon="🎯" />
          </div>

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
                  <thead><tr className="text-left text-xs text-gray-500 uppercase border-b">
                    <th className="pb-2 pr-4">Title</th>
                    <th className="pb-2 pr-4">Questions</th>
                    <th className="pb-2 pr-4">Assigned</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Actions</th>
                  </tr></thead>
                  <tbody>
                    {quizzes.map(q => (
                      <tr key={q.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 pr-4 font-medium text-gray-800">{q.title}</td>
                        <td className="py-3 pr-4 text-gray-500">{q.total_questions}</td>
                        <td className="py-3 pr-4 text-gray-500">{q.assigned_count} students</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${q.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {q.is_published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <Link to={`/teacher/quizzes/${q.id}/edit`} className="text-xs text-blue-600 hover:underline">Edit</Link>
                            <Link to={`/teacher/quizzes/${q.id}/assign`} className="text-xs text-green-600 hover:underline">Assign</Link>
                            <Link to={`/teacher/quizzes/${q.id}/analytics`} className="text-xs text-purple-600 hover:underline">Analytics</Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {quizzes.length > 0 && <Link to="/teacher/quizzes" className="block mt-4 text-sm text-red-600 hover:underline text-center">View all quizzes →</Link>}
          </div>
        </div>
      )}
    </AppLayout>
  )
}
