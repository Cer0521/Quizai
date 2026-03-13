import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QuestionCard from '../../../components/quiz/QuestionCard'
import QuizTimer from '../../../components/quiz/QuizTimer'
import api from '../../../api'

export default function QuizPage() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState(null) // { attempt, quiz, questions, savedAnswers }
  const [answers, setAnswers] = useState({}) // { [question_id]: { answer_text, selected_option_id } }
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)
  const saveTimerRef = useRef(null)

  useEffect(() => {
    api.get(`/assignments/${assignmentId}/attempt`).then(r => {
      setState(r.data)
      // Pre-populate saved answers
      const saved = {}
      r.data.savedAnswers?.forEach(a => {
        saved[a.question_id] = { answer_text: a.answer_text, selected_option_id: a.selected_option_id }
      })
      setAnswers(saved)
    }).catch(() => navigate('/student/dashboard'))
    .finally(() => setLoading(false))
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [assignmentId])

  const autoSave = useCallback((updatedAnswers) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const payload = Object.entries(updatedAnswers).map(([qid, ans]) => ({
        question_id: parseInt(qid), ...ans
      }))
      await api.put(`/attempts/${state.attempt.id}/answers`, { answers: payload }).catch(() => {})
    }, 1500)
  }, [state])

  function handleAnswer(questionId, ans) {
    const updated = { ...answers, [questionId]: ans }
    setAnswers(updated)
    autoSave(updated)
  }

  async function handleSubmit() {
    const unanswered = state.questions.filter(q => !answers[q.id]).length
    if (unanswered > 0 && !confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return
    setSubmitting(true)
    // Final save
    const payload = Object.entries(answers).map(([qid, ans]) => ({ question_id: parseInt(qid), ...ans }))
    await api.put(`/attempts/${state.attempt.id}/answers`, { answers: payload }).catch(() => {})
    const res = await api.post(`/attempts/${state.attempt.id}/submit`)
    sessionStorage.removeItem('quiz_timer')
    navigate(`/student/result/${state.attempt.id}`, { state: { result: res.data } })
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" />
    </div>
  )

  if (!state) return null
  const { quiz, questions } = state
  const answeredCount = Object.keys(answers).length
  const progress = Math.round((answeredCount / questions.length) * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 truncate text-base">{quiz.title}</h1>
            <p className="text-xs text-gray-400">{answeredCount}/{questions.length} answered</p>
          </div>
          {quiz.time_limit && <QuizTimer timeLimitMinutes={quiz.time_limit} onExpire={handleSubmit} />}
          <button onClick={handleSubmit} disabled={submitting}
            className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 transition flex-shrink-0">
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <div className="h-1 bg-red-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 flex gap-6">
        {/* Questions */}
        <div className="flex-1 space-y-4">
          {questions.map((q, i) => (
            <div key={q.id} id={`q-${i}`}>
              <QuestionCard question={q} index={i} answer={answers[q.id]} onChange={ans => handleAnswer(q.id, ans)} disabled={submitting} />
            </div>
          ))}
          <div className="text-center py-4">
            <button onClick={handleSubmit} disabled={submitting}
              className="px-8 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition">
              {submitting ? 'Submitting...' : '✓ Submit Quiz'}
            </button>
          </div>
        </div>

        {/* Question navigator */}
        <div className="hidden md:block w-48 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sticky top-24">
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase">Questions</p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, i) => (
                <button key={q.id} onClick={() => document.getElementById(`q-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className={`w-7 h-7 rounded text-xs font-semibold transition ${answers[q.id] ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-600 rounded inline-block" /> Done</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-100 rounded inline-block" /> Blank</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
