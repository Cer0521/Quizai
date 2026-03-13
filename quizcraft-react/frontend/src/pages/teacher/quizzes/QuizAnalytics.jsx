import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../../components/AppLayout'
import ScoreBarChart from '../../../components/charts/ScoreBarChart'
import CompletionPieChart from '../../../components/charts/CompletionPieChart'
import api from '../../../api'

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color || 'text-gray-800'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function QuizAnalytics() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get(`/quizzes/${id}/analytics`).then(r => setData(r.data)).finally(() => setLoading(false))
  }, [id])

  function scoreColor(score) {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-blue-600'
    if (score >= 50) return 'text-orange-500'
    return 'text-red-600'
  }

  function formatTime(secs) {
    if (!secs) return '—'
    const m = Math.floor(secs / 60), s = secs % 60
    return `${m}m ${s}s`
  }

  const filtered = (data?.students || []).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <AppLayout><div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" /></div></AppLayout>

  if (!data) return <AppLayout><p className="text-center py-20 text-gray-400">Analytics not available.</p></AppLayout>

  const { quiz, summary, score_distribution, students } = data

  return (
    <AppLayout header={
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Analytics</h2>
          <p className="text-sm text-gray-400 mt-0.5">{quiz.title}</p>
        </div>
        <button onClick={() => navigate(`/teacher/quizzes/${id}/edit`)} className="text-sm text-gray-500 hover:text-gray-700">← Back to Quiz</button>
      </div>
    }>
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Assigned" value={summary.total_assigned} color="text-blue-600" />
          <StatCard label="Completed" value={summary.total_completed} sub={`${summary.completion_rate}% rate`} color="text-green-600" />
          <StatCard label="Average Score" value={`${summary.average_score}%`} color="text-purple-600" />
          <StatCard label="Score Range" value={`${summary.lowest_score}–${summary.highest_score}%`} color="text-orange-600" />
        </div>

        {/* Status breakdown */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Not Started', val: summary.total_not_started, bg: 'bg-gray-100', text: 'text-gray-700' },
            { label: 'In Progress', val: summary.total_in_progress, bg: 'bg-yellow-50', text: 'text-yellow-700' },
            { label: 'Completed', val: summary.total_completed, bg: 'bg-green-50', text: 'text-green-700' },
          ].map(item => (
            <div key={item.label} className={`${item.bg} rounded-xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${item.text}`}>{item.val}</p>
              <p className="text-xs text-gray-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        {students.length > 0 && (
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Score Distribution</h3>
              <ScoreBarChart distribution={score_distribution} />
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Completion Status</h3>
              <CompletionPieChart
                completed={summary.total_completed}
                inProgress={summary.total_in_progress}
                notStarted={summary.total_not_started}
              />
            </div>
          </div>
        )}

        {/* Student results table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">Student Results</h3>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search students..."
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48 focus:border-red-500 focus:ring-1 focus:ring-red-500" />
          </div>
          {students.length === 0
            ? <p className="text-center py-8 text-gray-400 text-sm">No submissions yet.</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left text-xs text-gray-500 uppercase">
                      <th className="pb-2 pr-4">Student</th>
                      <th className="pb-2 pr-4">Score</th>
                      <th className="pb-2 pr-4">Correct</th>
                      <th className="pb-2 pr-4">Time Taken</th>
                      <th className="pb-2">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(s => (
                      <tr key={s.student_id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-gray-800">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.email}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`font-bold text-base ${scoreColor(s.score)}`}>{s.score}%</span>
                        </td>
                        <td className="py-3 pr-4 text-gray-600">{s.total_correct} / {quiz.total_questions}</td>
                        <td className="py-3 pr-4 text-gray-500">{formatTime(s.time_taken)}</td>
                        <td className="py-3 text-gray-400 text-xs">{s.submitted_at?.split('T')[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      </div>
    </AppLayout>
  )
}
