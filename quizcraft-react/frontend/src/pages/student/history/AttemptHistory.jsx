import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../../components/AppLayout'
import api from '../../../api'

export default function AttemptHistory() {
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/attempts/history').then(r => setAttempts(r.data.attempts)).finally(() => setLoading(false))
  }, [])

  function scoreColor(s) {
    if (s >= 90) return 'text-green-600'
    if (s >= 75) return 'text-blue-600'
    if (s >= 50) return 'text-orange-500'
    return 'text-red-600'
  }

  function formatTime(secs) {
    if (!secs) return '—'
    return `${Math.floor(secs / 60)}m ${secs % 60}s`
  }

  return (
    <AppLayout header={<h2 className="text-xl font-bold text-gray-800">Attempt History</h2>}>
      {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" /></div> : (
        attempts.length === 0
          ? <div className="text-center py-20 text-gray-400">
              <p className="text-5xl mb-3">📖</p>
              <p>No completed quizzes yet.</p>
              <Link to="/student/dashboard" className="text-red-600 hover:underline text-sm mt-2 inline-block">Take a quiz →</Link>
            </div>
          : <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left text-xs text-gray-500 uppercase">
                    <th className="px-5 py-3">Quiz</th>
                    <th className="px-5 py-3">Score</th>
                    <th className="px-5 py-3">Correct</th>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a, i) => (
                    <tr key={a.id} className={`border-b last:border-0 hover:bg-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                      <td className="px-5 py-3 font-medium text-gray-800">{a.quiz_title}</td>
                      <td className="px-5 py-3"><span className={`font-bold text-base ${scoreColor(a.score)}`}>{a.score}%</span></td>
                      <td className="px-5 py-3 text-gray-500">{a.total_correct}/{a.total_questions}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{formatTime(a.time_taken)}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{a.submitted_at?.split('T')[0]}</td>
                      <td className="px-5 py-3">
                        <Link to={`/student/result/${a.id}`} className="text-xs text-blue-600 hover:underline font-medium">View →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      )}
    </AppLayout>
  )
}
