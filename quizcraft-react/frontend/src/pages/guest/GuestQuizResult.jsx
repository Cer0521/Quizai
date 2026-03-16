import { useEffect, useState } from 'react'
import { useParams, useLocation, useSearchParams } from 'react-router-dom'
import api from '../../api'

function EssayFeedback({ ans }) {
  const [open, setOpen] = useState(false)
  if (!ans?.ai_feedback) return null
  const correct = ans?.is_correct === 1
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(o => !o)}
        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        AI Feedback {open ? '▲' : '▼'}
      </button>
      {open && (
        <p className="text-xs text-gray-600 mt-1.5 bg-gray-50 rounded-lg p-3 leading-relaxed">
          {ans.ai_feedback}
        </p>
      )}
    </div>
  )
}

export default function GuestQuizResult() {
  const { token, attemptId } = useParams()
  const [searchParams] = useSearchParams()
  const attemptToken = searchParams.get('t')
  const { state: navState } = useLocation()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/public/attempt/${attemptId}/result?token=${attemptToken}`)
      .then(r => setData(r.data))
      .catch(() => setError('Result not found or token invalid.'))
      .finally(() => setLoading(false))
  }, [attemptId, attemptToken])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" />
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-5xl mb-4">😔</p>
        <p className="text-gray-500 text-sm">{error || 'Could not load result.'}</p>
      </div>
    </div>
  )

  const { attempt, quiz, questions } = data
  const showScore = quiz.show_score !== 0

  if (!showScore) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center max-w-sm w-full">
          <p className="text-5xl mb-4">✅</p>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Quiz Submitted!</h2>
          <p className="text-gray-500 text-sm">Your answers have been recorded. Your teacher will share your results.</p>
        </div>
      </div>
    )
  }

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
          <p className="text-gray-500 text-sm mt-2 font-medium">{attempt.student_display_name}</p>
        </div>

        {/* Per-question breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Question Breakdown</h3>
          <div className="space-y-3">
            {questions.map((q, i) => {
              const ans = q.student_answer
              const correct = ans?.is_correct === 1
              const isEssay = q.question_type === 'essay'

              let displayAnswer = ans?.answer_text
              if (!displayAnswer && ans?.selected_option_id) {
                const opt = q.options?.find(o => o.id === ans.selected_option_id)
                displayAnswer = opt ? `${opt.option_label}. ${opt.option_text}` : 'Selected option'
              }
              displayAnswer = displayAnswer || 'Not answered'

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
                          {displayAnswer}
                        </span>
                      </p>
                      {!correct && !isEssay && (
                        <p className="text-xs text-green-700 mt-0.5">Correct: <span className="font-semibold">{q.correct_answer}</span></p>
                      )}
                      {isEssay && !correct && (
                        <p className="text-xs text-green-700 mt-0.5">Expected: <span className="font-semibold">{q.correct_answer}</span></p>
                      )}
                      {isEssay && <EssayFeedback ans={ans} />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
