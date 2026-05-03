import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../../../components/AppLayout'
import api from '../../../api'
import { useAuth } from '../../../contexts/AuthContext'

const TYPES = ['Multiple Choice', 'True or False', 'Enumeration']

export default function GenerateQuiz() {
  const navigate = useNavigate()
  const { subscription } = useAuth()
  const [form, setForm] = useState({ title: '', description: '', time_limit: '', total_questions: '' })
  const [sections, setSections] = useState([{ type: 'Multiple Choice', count: '' }])
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function addSection() { setSections([...sections, { type: 'Multiple Choice', count: '' }]) }
  function removeSection(i) { setSections(sections.filter((_, idx) => idx !== i)) }
  function updateSection(i, field, val) { setSections(sections.map((s, idx) => idx === i ? { ...s, [field]: val } : s)) }

  const sectionTotal = sections.reduce((sum, s) => sum + (parseInt(s.count) || 0), 0)
  const totalQ = parseInt(form.total_questions) || 0
  const mismatch = totalQ > 0 && sectionTotal !== totalQ
  const usageText = subscription?.quiz_limit == null
    ? 'Unlimited'
    : `${subscription?.quiz_count || 0}/${subscription?.quiz_limit || 5}`

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})
    if (!file) return setErrors({ general: ['Please upload a document.'] })
    if (mismatch) return setErrors({ sections: [`Section total (${sectionTotal}) must equal Total Questions (${totalQ}).`] })
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v))
      fd.append('document', file)
      fd.append('sections', JSON.stringify(sections))
      const res = await api.post('/quizzes/generate', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      sessionStorage.setItem('flash', res.data.message || 'Quiz generated successfully!')
      navigate(`/teacher/quizzes/${res.data.quiz.id}/edit`)
    } catch (err) {
      if (err.response?.data?.code === 'QUIZ_LIMIT_REACHED') {
        setErrors({ general: ['Free plan limit reached (5 quizzes / 14 days). Upgrade to Pro or Team for unlimited quizzes.'] })
      } else if (err.response?.data?.code === 'FEATURE_LOCKED') {
        setErrors({ general: ['AI blueprinting is available on Pro and Team plans.'] })
      } else {
        setErrors(err.response?.data?.errors || { general: [err.response?.data?.message || 'Generation failed.'] })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout header={<h2 className="text-xl font-bold text-gray-800">✨ Generate Quiz with AI</h2>}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-4 bg-brand-50 border border-brand-200 text-brand-700 px-4 py-3 rounded-lg text-sm flex justify-between items-center">
          <span>Quiz usage this cycle: <strong>{usageText}</strong></span>
          <Link to="/pricing" className="font-semibold underline">Manage plan</Link>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          {errors.general && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{errors.general[0]}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Title <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="input" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="input resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Questions <span className="text-red-500">*</span></label>
              <input type="number" min="1" max="100" value={form.total_questions} onChange={e => setForm({ ...form, total_questions: e.target.value })} required className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (minutes)</label>
              <input type="number" min="1" value={form.time_limit} onChange={e => setForm({ ...form, time_limit: e.target.value })} placeholder="No limit" className="input" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Document <span className="text-red-500">*</span></label>
            <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl p-4 cursor-pointer transition ${file ? 'border-brand-400 bg-brand-50' : 'border-gray-300 hover:border-gray-400'}`}>
              <input type="file" accept=".pdf,.txt" onChange={e => setFile(e.target.files[0])} className="sr-only" />
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              <div className="flex-1 min-w-0">
                {file ? <p className="text-sm font-medium text-brand-700 truncate">{file.name}</p> : <><p className="text-sm text-gray-600">Click to upload PDF or TXT</p><p className="text-xs text-gray-400">Max 5MB</p></>}
              </div>
              {file && <button type="button" onClick={e => { e.preventDefault(); setFile(null) }} className="text-gray-400 hover:text-gray-600 text-lg">×</button>}
            </label>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Question Sections</label>
              <button type="button" onClick={addSection} className="text-xs text-brand-600 hover:underline font-medium">+ Add Section</button>
            </div>
            {errors.sections && <p className="text-red-600 text-xs mb-2">{errors.sections[0]}</p>}
            <div className="space-y-2">
              {sections.map((s, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={s.type} onChange={e => updateSection(i, 'type', e.target.value)} className="input flex-1">
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <input type="number" min="1" value={s.count} onChange={e => updateSection(i, 'count', e.target.value)} placeholder="# questions" className="input w-28" />
                  {sections.length > 1 && <button type="button" onClick={() => removeSection(i)} className="text-gray-400 hover:text-red-500 text-lg">×</button>}
                </div>
              ))}
            </div>
            <p className={`text-xs mt-2 ${mismatch ? 'text-red-600' : 'text-gray-400'}`}>
              Section total: <strong>{sectionTotal}</strong> / Total Questions: <strong>{totalQ || '?'}</strong>
              {mismatch && ' — must match'}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => navigate('/teacher/quizzes')} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading || mismatch} className="btn-primary flex items-center gap-2">
              {loading ? <><span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full inline-block" /> Generating...</> : '✨ Generate Quiz'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
