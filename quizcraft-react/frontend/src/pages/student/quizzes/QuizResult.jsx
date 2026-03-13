import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom'
import api from '../../../api'

export default function QuizResult() {
  const { attemptId } = useParams()
  const { state: navState } = useLocation()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!navState?.result)

  useEffect(() => {
    api.get(`/attempts/${attemptId}/result`).then(r => setData(r.data)).finally(() => setLoading(false))
  }, [attemptId])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" />
    </div>
  )

  if (!data) return null
  const { attempt, quiz, questions } = data
  const score = attempt.score ?? 0
  const grade = score >= 90 ? { label: 'Excellent!', color: 'text-green-600', bg: 'bg-green-50', emoji: '🏆' }
    : score >= 75 ? { label: 'Great Job!', color: 'text-blue-600', bg: 'bg-blue-50', emoji: '🎉' }
    : score >= 50 ? { label: 'Good Effort', color: 'text-orange-600', bg: 'bg-orange-50', emoji: '👍' }
    : { label: 'Keep Practicing', color: 'text-red-600', bg: 'bg-red-50', emoji: '💪' }

  const timeTaken = attempt.time_taken
    ? `${Math.floor(attempt.time_taken / 60)}m ${attempt.time_taken % 60}s` : '—'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Score card */}
        <div className={`${grade.bg} rounded-2xl p-8 text-center`}>
          <p className="text-5xl mb-3">{grade.emoji}</p>
          <p className={`text-2xl font-bold ${grade.color}`}>{grade.label}</p>
          <p className={`text-6xl font-extrabold ${grade.color} mt-2`}>{score}%</p>
          <p className="text-gray-500 mt-2 text-sm">{attempt.total_correct} out of {quiz.total_questions} correct</p>
          <p className="text-gray-400 text-xs mt-1">Time: {timeTaken}</p>
        </div>

        {/* Per-question breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Question Breakdown</h3>
          <div className="space-y-3">
            {questions.map((q, i) => {
              const ans = q.student_answer
              const correct = ans?.is_correct === 1
              return (
                <div key={q.id} className={`rounded-lg border p-4 ${correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-start gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {correct ? '✓' : '✗'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{i + 1}. {q.question_text}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Your answer: <span className={correct ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                          {ans?.answer_text || (ans?.selected_option_id ? 'Selected option' : 'Not answered')}
                        </span>
                      </p>
                      {!correct && <p className="text-xs text-green-700 mt-0.5">Correct: <span className="font-semibold">{q.correct_answer}</span></p>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-between">
          <Link to="/student/dashboard" className="px-5 py-2.5 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition">← Dashboard</Link>
          <Link to="/student/history" className="px-5 py-2.5 bg-gray-800 text-white text-sm font-bold rounded-lg hover:bg-gray-700 transition">View History</Link>
        </div>
      </div>
    </div>
  )
}
