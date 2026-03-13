import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import api from '../../api'

export default function StudentDashboard() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/assignments').then(r => setAssignments(r.data.assignments)).finally(() => setLoading(false))
  }, [])

  function statusBadge(status) {
    const map = {
      pending: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700'
    }
    const label = { pending: 'Not Started', in_progress: 'In Progress', completed: 'Completed' }
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] || 'bg-gray-100 text-gray-600'}`}>{label[status] || status}</span>
  }

  const pending = assignments.filter(a => a.status !== 'completed').length
  const completed = assignments.filter(a => a.status === 'completed').length
  const scores = assignments.filter(a => a.latest_attempt?.score != null).map(a => a.latest_attempt.score)
  const avgScore = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null

  return (
    <AppLayout header={<h2 className="text-xl font-bold text-gray-800">My Quizzes</h2>}>
      {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" /></div> : (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Assigned', value: assignments.length, color: 'text-blue-600', icon: '📋' },
              { label: 'Pending', value: pending, color: 'text-yellow-600', icon: '⏳' },
              { label: 'Completed', value: completed, color: 'text-green-600', icon: '✅' },
              { label: 'Avg Score', value: avgScore != null ? `${avgScore}%` : '—', color: 'text-purple-600', icon: '🎯' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                  <span className="text-3xl">{s.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quiz list */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Assigned Quizzes</h3>
              <Link to="/student/history" className="text-sm text-red-600 hover:underline">View History →</Link>
            </div>
            {assignments.length === 0
              ? <div className="text-center py-16 text-gray-400">
                  <p className="text-4xl mb-3">📚</p>
                  <p>No quizzes assigned yet. Check back soon!</p>
                </div>
              : <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr className="text-left text-xs text-gray-500 uppercase">
                        <th className="px-5 py-3">Quiz</th>
                        <th className="px-5 py-3">Teacher</th>
                        <th className="px-5 py-3">Due Date</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Score</th>
                        <th className="px-5 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a, i) => (
                        <tr key={a.id} className={`border-b last:border-0 hover:bg-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-800">{a.quiz_title}</p>
                            <p className="text-xs text-gray-400">{a.total_questions} questions{a.time_limit ? ` · ${a.time_limit}min` : ''}</p>
                          </td>
                          <td className="px-5 py-3 text-gray-500 text-xs">{a.teacher_name}</td>
                          <td className="px-5 py-3 text-gray-500 text-xs">{a.due_date || '—'}</td>
                          <td className="px-5 py-3">{statusBadge(a.status)}</td>
                          <td className="px-5 py-3">
                            {a.latest_attempt?.score != null
                              ? <span className={`font-bold ${a.latest_attempt.score >= 75 ? 'text-green-600' : a.latest_attempt.score >= 50 ? 'text-orange-500' : 'text-red-600'}`}>
                                  {a.latest_attempt.score}%
                                </span>
                              : <span className="text-gray-300">—</span>
                            }
                          </td>
                          <td className="px-5 py-3">
                            {a.status === 'completed'
                              ? <button onClick={() => navigate(`/student/quiz/${a.id}`)} className="text-xs text-gray-400 hover:text-blue-600 hover:underline">Review</button>
                              : <button onClick={() => navigate(`/student/quiz/${a.id}`)}
                                  className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition">
                                  {a.status === 'in_progress' ? 'Continue →' : 'Start →'}
                                </button>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        </div>
      )}
    </AppLayout>
  )
}
