import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../../components/AppLayout'
import api from '../../../api'

const TYPES = ['multiple_choice', 'true_false', 'enumeration']
const TYPE_LABELS = { multiple_choice: 'Multiple Choice', true_false: 'True or False', enumeration: 'Enumeration' }

function emptyQuestion() {
  return { question_text: '', question_type: 'multiple_choice', correct_answer: '', options: ['', '', '', ''] }
}

export default function CreateQuiz() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [meta, setMeta] = useState({ title: '', description: '', time_limit: '' })
  const [questions, setQuestions] = useState([emptyQuestion()])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  function addQuestion() { setQuestions([...questions, emptyQuestion()]) }
  function removeQuestion(i) { setQuestions(questions.filter((_, idx) => idx !== i)) }
  function updateQ(i, field, val) { setQuestions(questions.map((q, idx) => idx === i ? { ...q, [field]: val } : q)) }
  function updateOption(qi, oi, val) {
    setQuestions(questions.map((q, i) => i === qi ? { ...q, options: q.options.map((o, j) => j === oi ? val : o) } : q))
  }

  async function handleSave() {
    setSaving(true); setErrors({})
    try {
      const res = await api.post('/quizzes/manual', meta)
      const quizId = res.data.quiz.id
      for (const q of questions.filter(q => q.question_text.trim())) {
        const payload = { question_text: q.question_text, question_type: q.question_type, correct_answer: q.correct_answer }
        if (q.question_type === 'multiple_choice') payload.options = q.options.filter(o => o.trim())
        await api.post(`/quizzes/${quizId}/questions`, payload)
      }
      sessionStorage.setItem('flash', 'Quiz created successfully!')
      navigate(`/teacher/quizzes/${quizId}/edit`)
    } catch (err) {
      setErrors(err.response?.data?.errors || { general: ['Failed to save quiz.'] })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout header={<h2 className="text-xl font-bold text-gray-800">✏️ Create Quiz Manually</h2>}>
      <div className="max-w-2xl mx-auto space-y-5">
        {errors.general && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{errors.general[0]}</div>}

        {/* Step 1: Meta */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Quiz Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
              <input value={meta.title} onChange={e => setMeta({ ...meta, title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={meta.description} onChange={e => setMeta({ ...meta, description: e.target.value })} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (minutes)</label>
              <input type="number" min="1" value={meta.time_limit} onChange={e => setMeta({ ...meta, time_limit: e.target.value })}
                placeholder="No limit"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500" />
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((q, qi) => (
            <div key={qi} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold text-gray-700 text-sm">Question {qi + 1}</span>
                {questions.length > 1 && <button onClick={() => removeQuestion(qi)} className="text-xs text-red-500 hover:underline">Remove</button>}
              </div>
              <div className="space-y-3">
                <textarea value={q.question_text} onChange={e => updateQ(qi, 'question_text', e.target.value)}
                  placeholder="Question text..." rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500" />
                <select value={q.question_type} onChange={e => updateQ(qi, 'question_type', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500">
                  {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
                {q.question_type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Answer options (A, B, C, D)</p>
                    {q.options.map((o, oi) => (
                      <div key={oi} className="flex gap-2 items-center">
                        <span className="text-xs font-bold text-gray-400 w-4">{['A','B','C','D'][oi]}.</span>
                        <input value={o} onChange={e => updateOption(qi, oi, e.target.value)}
                          placeholder={`Option ${['A','B','C','D'][oi]}`}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:border-red-500" />
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Correct Answer</label>
                  {q.question_type === 'true_false'
                    ? <select value={q.correct_answer} onChange={e => updateQ(qi, 'correct_answer', e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:border-red-500">
                        <option value="">Select...</option>
                        <option>True</option><option>False</option>
                      </select>
                    : q.question_type === 'multiple_choice'
                    ? <select value={q.correct_answer} onChange={e => updateQ(qi, 'correct_answer', e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:border-red-500">
                        <option value="">Select correct option...</option>
                        {['A','B','C','D'].map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    : <input value={q.correct_answer} onChange={e => updateQ(qi, 'correct_answer', e.target.value)}
                        placeholder="Type correct answer..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:border-red-500" />
                  }
                </div>
              </div>
            </div>
          ))}
          <button onClick={addQuestion} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-red-400 hover:text-red-600 transition">
            + Add Question
          </button>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={() => navigate('/teacher/quizzes')} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !meta.title.trim()}
            className="px-5 py-2 bg-gray-800 text-white text-sm font-bold rounded-lg hover:bg-gray-700 disabled:opacity-50 transition">
            {saving ? 'Saving...' : 'Save Quiz'}
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
