import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import QuestionCard from '../../../components/quiz/QuestionCard'
import QuizTimer from '../../../components/quiz/QuizTimer'
import PreQuizGate from '../../../components/quiz/PreQuizGate'
import { useQuizProtection } from '../../../hooks/useQuizProtection'
import api from '../../../api'

export default function QuizPage() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [state, setState] = useState(null)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [gateComplete, setGateComplete] = useState(false)
  const [fullscreenLost, setFullscreenLost] = useState(false)
  const [protectionNotice, setProtectionNotice] = useState('')
  const saveTimerRef = useRef(null)
  const submittingRef = useRef(false)

  useEffect(() => {
    api.get(`/assignments/${assignmentId}/attempt`).then(r => {
      setState(r.data)
      const saved = {}
      r.data.savedAnswers?.forEach(a => {
        saved[a.question_id] = { answer_text: a.answer_text, selected_option_id: a.selected_option_id }
      })
      setAnswers(saved)
    }).catch(() => navigate('/student/dashboard'))
    .finally(() => setLoading(false))
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [assignmentId])

  // Clean up fullscreen on unmount
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [])

  async function handleGateComplete(displayName, photoData) {
    if (state?.attempt?.id) {
      await api.patch(`/attempts/${state.attempt.id}/photo`, {
        student_display_name: displayName,
        photo_data: photoData,
      }).catch(() => {})
    }
    setGateComplete(true)
    // Request fullscreen
    document.documentElement.requestFullscreen().catch(() => {
      // Fullscreen might be denied — still allow quiz to proceed
    })
  }

  function requestFullscreenAgain() {
    document.documentElement.requestFullscreen().catch(() => {})
    setFullscreenLost(false)
  }

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

  const handleSubmit = useCallback(async ({ forced = false, reason = '' } = {}) => {
    if (!state?.attempt?.id || submittingRef.current) return

    const unanswered = state.questions.filter(q => !answers[q.id]).length
    if (!forced && unanswered > 0 && !confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return

    submittingRef.current = true
    setSubmitting(true)

    const payload = Object.entries(answers).map(([qid, ans]) => ({ question_id: parseInt(qid), ...ans }))
    try {
      await api.put(`/attempts/${state.attempt.id}/answers`, { answers: payload }).catch(() => {})
      const res = await api.post(`/attempts/${state.attempt.id}/submit`)
      sessionStorage.removeItem('quiz_timer')
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
      navigate(`/student/result/${state.attempt.id}`, {
        state: { result: { ...res.data, auto_submitted: forced, auto_submit_reason: reason } }
      })
    } catch {
      setSubmitting(false)
      submittingRef.current = false
    }
  }, [answers, navigate, state])

  const handleProtectionViolation = useCallback((event) => {
    if (!gateComplete || submittingRef.current) return

    setProtectionNotice(event.message)

    if (event.shouldAutoSubmit) {
      handleSubmit({ forced: true, reason: event.type })
    }
  }, [gateComplete, handleSubmit])

  const { violations, registerManualViolation } = useQuizProtection(state?.attempt?.id, handleProtectionViolation, {
    enabled: gateComplete && !submitting,
    maxViolations: 3
  })

  // Fullscreen change listener
  useEffect(() => {
    if (!gateComplete || submitting) return

    function onFsChange() {
      const isFullscreen = Boolean(document.fullscreenElement)
      setFullscreenLost(!isFullscreen)

      if (!isFullscreen) {
        registerManualViolation('fullscreen_exit', 'Warning: fullscreen exit detected')
      }
    }

    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [gateComplete, registerManualViolation, submitting])

  useEffect(() => {
    if (!protectionNotice) return

    const timer = setTimeout(() => setProtectionNotice(''), 3500)
    return () => clearTimeout(timer)
  }, [protectionNotice])

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
      {/* Pre-quiz gate */}
      {!gateComplete && (
        <PreQuizGate
          prefillName={user?.name || ''}
          onComplete={handleGateComplete}
        />
      )}

      {/* Fullscreen lost overlay */}
      {gateComplete && fullscreenLost && (
        <div className="fixed inset-0 bg-gray-900/95 flex flex-col items-center justify-center z-50 text-center p-6">
          <p className="text-5xl mb-4">⚠️</p>
          <h2 className="text-white text-2xl font-bold mb-2">Fullscreen Required</h2>
          <p className="text-gray-300 text-sm mb-6 max-w-sm">
            You must stay in fullscreen during the quiz to prevent cheating. Please return to fullscreen to continue.
          </p>
          <button onClick={requestFullscreenAgain}
            className="px-8 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition">
            Return to Fullscreen
          </button>
        </div>
      )}

      {/* Violation warning */}
      {gateComplete && protectionNotice && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-xl bg-amber-50 border border-amber-300 text-amber-900 rounded-lg shadow-md px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{protectionNotice}</p>
            <span className="text-xs font-bold bg-amber-200 text-amber-900 px-2 py-1 rounded">
              Violations: {violations}/3
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 truncate text-base">{quiz.title}</h1>
            <p className="text-xs text-gray-400">{answeredCount}/{questions.length} answered</p>
          </div>
          {quiz.time_limit && <QuizTimer timeLimitMinutes={quiz.time_limit} onExpire={() => handleSubmit({ forced: true, reason: 'timer_expired' })} />}
          <button onClick={handleSubmit} disabled={submitting}
            className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 transition flex-shrink-0">
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
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
