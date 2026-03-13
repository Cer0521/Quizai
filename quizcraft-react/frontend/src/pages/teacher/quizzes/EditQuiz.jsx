import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../../components/AppLayout'
import api from '../../../api'

const TYPE_LABELS = { multiple_choice: 'Multiple Choice', true_false: 'True or False', enumeration: 'Enumeration' }

export default function EditQuiz() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(sessionStorage.getItem('flash') || '')
  const [expandedQ, setExpandedQ] = useState(null)

  useEffect(() => {
    sessionStorage.removeItem('flash')
    api.get(`/quizzes/${id}`).then(r => {
      setQuiz(r.data.quiz)
      setTitle(r.data.quiz.title)
      setQuestions(r.data.quiz.questions || [])
    }).finally(() => setLoading(false))
  }, [id])

  async function saveTitle() {
    setSaving(true)
    await api.patch(`/quizzes/${id}`, { title, description: quiz.description, time_limit: quiz.time_limit })
    setFlash('Quiz title updated.')
    setSaving(false)
    setTimeout(() => setFlash(''), 3000)
  }

  async function saveQuestion(qi) {
    const q = questions[qi]
    const payload = { question_text: q.question_text, question_type: q.question_type, correct_answer: q.correct_answer }
    if (q.question_type === 'multiple_choice') payload.options = q.options.map(o => o.option_text || o)
    await api.put(`/quizzes/${id}/questions/${q.id}`, payload)
    setFlash('Question saved.')
    setTimeout(() => setFlash(''), 3000)
  }

  async function deleteQuestion(qi) {
    const q = questions[qi]
    if (!confirm('Delete this question?')) return
    await api.delete(`/quizzes/${id}/questions/${q.id}`)
    setQuestions(questions.filter((_, i) => i !== qi))
  }

  function updateQ(qi, field, val) {
    setQuestions(questions.map((q, i) => i === qi ? { ...q, [field]: val } : q))
  }

  if (loading) return <AppLayout><div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" /></div></AppLayout>

  return (
    <AppLayout header={
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Edit Quiz</h2>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/teacher/quizzes/${id}/assign`)} className="px-3 py-1.5 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition">Assign to Students</button>
          <button onClick={() => navigate(`/teacher/quizzes/${id}/analytics`)} className="px-3 py-1.5 text-xs font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">Analytics</button>
        </div>
      </div>
    }>
      {flash && <div className="mb-4 bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg text-sm">{flash}</div>}
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Title */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Title</label>
          <div className="flex gap-2">
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500" />
            <button onClick={saveTitle} disabled={saving}
              className="px-4 py-2 bg-gray-800 text-white text-sm font-bold rounded-lg hover:bg-gray-700 disabled:opacity-50 transition">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">{questions.length} questions · {quiz?.source_type === 'ai' ? '✨ AI generated' : '✏️ Manual'}</p>
        </div>

        {/* Questions */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700">Questions</h3>
          {questions.map((q, qi) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedQ(expandedQ === qi ? null : qi)}>
                <span className="w-7 h-7 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{qi + 1}</span>
                <p className="flex-1 text-sm text-gray-800 truncate">{q.question_text}</p>
                <span className="text-xs text-gray-400">{TYPE_LABELS[q.question_type]}</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedQ === qi ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {expandedQ === qi && (
                <div className="border-t p-4 space-y-3">
                  <textarea value={q.question_text} onChange={e => updateQ(qi, 'question_text', e.target.value)} rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500" />
                  {q.options?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-medium">Options</p>
                      {q.options.map((opt, oi) => (
                        <div key={opt.id || oi} className="flex gap-2 items-center">
                          <span className="text-xs font-bold text-gray-400 w-4">{opt.option_label || ['A','B','C','D'][oi]}.</span>
                          <input value={opt.option_text || opt} onChange={e => {
                            const newOpts = [...q.options]
                            newOpts[oi] = { ...opt, option_text: e.target.value }
                            updateQ(qi, 'options', newOpts)
                          }} className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:border-red-500" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Correct Answer</label>
                    <input value={q.correct_answer} onChange={e => updateQ(qi, 'correct_answer', e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:border-red-500" />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => deleteQuestion(qi)} className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Delete</button>
                    <button onClick={() => saveQuestion(qi)} className="px-3 py-1.5 text-xs font-bold bg-gray-800 text-white rounded-lg hover:bg-gray-700">Save Question</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          <button onClick={() => navigate('/teacher/quizzes')} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">← Back to Quizzes</button>
        </div>
      </div>
    </AppLayout>
  )
}
