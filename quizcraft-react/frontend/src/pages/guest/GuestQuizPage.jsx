import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QuestionCard from '../../components/quiz/QuestionCard'
import QuizTimer from '../../components/quiz/QuizTimer'
import PreQuizGate from '../../components/quiz/PreQuizGate'
import api from '../../api'

export default function GuestQuizPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [quizData, setQuizData] = useState(null)   // { quiz, questions }
  const [attempt, setAttempt] = useState(null)       // { id, attempt_token, ... }
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [gateComplete, setGateComplete] = useState(false)
  const [fullscreenLost, setFullscreenLost] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const saveTimerRef = useRef(null)

  useEffect(() => {
    api.get(`/public/quiz/${token}`)
      .then(r => setQuizData(r.data))
      .catch(() => setError('Quiz not found or not available.'))
      .finally(() => setLoading(false))
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [token])

  useEffect(() => {
    if (!gateComplete) return
    function onFsChange() { setFullscreenLost(!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [gateComplete])

  useEffect(() => {
    return () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}) }
  }, [])

  async function handleGateComplete(name, photoData) {
    try {
      const res = await api.post(`/public/quiz/${token}/start`, { name, photo_data: photoData })
      const data = res.data
      setAttempt(data.attempt)
      sessionStorage.setItem(`guest_attempt_${token}`, JSON.stringify({ id: data.attempt.id, attempt_token: data.attempt.attempt_token }))
      setGateComplete(true)
      document.documentElement.requestFullscreen().catch(() => {})
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to start quiz. Please try again.')
    }
  }

  function requestFullscreenAgain() {
    document.documentElement.requestFullscreen().catch(() => {})
    setFullscreenLost(false)
  }

  const autoSave = useCallback((updatedAnswers) => {
    if (!attempt) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const payload = Object.entries(updatedAnswers).map(([qid, ans]) => ({
        question_id: parseInt(qid), ...ans
      }))
      await api.put(`/public/attempt/${attempt.id}/answers`, {
        attempt_token: attempt.attempt_token,
        answers: payload,
      }).catch(() => {})
    }, 1500)
  }, [attempt])

  function handleAnswer(questionId, ans) {
    const updated = { ...answers, [questionId]: ans }
    setAnswers(updated)
    autoSave(updated)
  }

  async function handleSubmit() {
    if (!attempt) return
    const questions = quizData?.questions || []
    const unanswered = questions.filter(q => !answers[q.id]).length
    if (unanswered > 0 && !confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return
    setSubmitting(true)
    // Final save
    const payload = Object.entries(answers).map(([qid, ans]) => ({ question_id: parseInt(qid), ...ans }))
    await api.put(`/public/attempt/${attempt.id}/answers`, {
      attempt_token: attempt.attempt_token, answers: payload,
    }).catch(() => {})
    const res = await api.post(`/public/attempt/${attempt.id}/submit`, { attempt_token: attempt.attempt_token })
    sessionStorage.removeItem(`guest_attempt_${token}`)
    sessionStorage.removeItem('quiz_timer')
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
    navigate(`/quiz/${token}/result/${attempt.id}?t=${attempt.attempt_token}`, {
      state: { result: res.data, show_score: res.data.show_score }
    })
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-5xl mb-4">😔</p>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Quiz Unavailable</h2>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  )

  const { quiz, questions } = quizData
  const answeredCount = Object.keys(answers).length
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {!gateComplete && (
        <PreQuizGate prefillName="" onComplete={handleGateComplete} />
      )}

      {gateComplete && fullscreenLost && (
        <div className="fixed inset-0 bg-gray-900/95 flex flex-col items-center justify-center z-50 text-center p-6">
          <p className="text-5xl mb-4">⚠️</p>
          <h2 className="text-white text-2xl font-bold mb-2">Fullscreen Required</h2>
          <p className="text-gray-300 text-sm mb-6 max-w-sm">
            You must stay in fullscreen during the quiz. Please return to fullscreen to continue.
          </p>
          <button onClick={requestFullscreenAgain}
            className="px-8 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition">
            Return to Fullscreen
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 truncate text-base">{quiz.title}</h1>
            <p className="text-xs text-gray-400">{answeredCount}/{questions.length} answered</p>
          </div>
          {quiz.time_limit && attempt && <QuizTimer timeLimitMinutes={quiz.time_limit} onExpire={handleSubmit} />}
          <button onClick={handleSubmit} disabled={submitting || !attempt}
            className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 transition flex-shrink-0">
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
        <div className="h-1 bg-gray-200">
          <div className="h-1 bg-red-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 flex gap-6">
        <div className="flex-1 space-y-4">
          {questions.map((q, i) => (
            <div key={q.id} id={`q-${i}`}>
              <QuestionCard question={q} index={i} answer={answers[q.id]}
                onChange={ans => handleAnswer(q.id, ans)} disabled={submitting || !attempt} />
            </div>
          ))}
          <div className="text-center py-4">
            <button onClick={handleSubmit} disabled={submitting || !attempt}
              className="px-8 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition">
              {submitting ? 'Submitting...' : '✓ Submit Quiz'}
            </button>
          </div>
        </div>

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
          </div>
        </div>
      </div>
    </div>
  )
}
