import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import api from '../../api'

export default function CreateQuiz() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [document, setDocument] = useState(null)
  const [total, setTotal] = useState(60)
  const [sections, setSections] = useState([{ type: 'Multiple Choice', count: 10 }])
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const assignedQuestions = sections.reduce((sum, s) => sum + (parseInt(s.count) || 0), 0)
  const remainingQuestions = total - assignedQuestions

  function addSection() {
    setSections([...sections, { type: 'Multiple Choice', count: 10 }])
  }

  function removeSection(index) {
    setSections(sections.filter((_, i) => i !== index))
  }

  function updateSection(index, field, value) {
    const updated = [...sections]
    updated[index] = { ...updated[index], [field]: field === 'count' ? parseInt(value) || 0 : value }
    setSections(updated)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('total_questions', total)
      formData.append('document', document)
      formData.append('sections', JSON.stringify(sections))

      const res = await api.post('/quizzes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      sessionStorage.setItem('success', 'Assessment generated successfully!')
      navigate(`/quizzes/${res.data.quiz.id}`)
    } catch (err) {
      setErrors(err.response?.data?.errors || { general: [err.response?.data?.message || 'Something went wrong.'] })
      setLoading(false)
    }
  }

  return (
    <AppLayout
      header={
        <h2 className="font-semibold text-xl text-gray-800 leading-tight">Create New Assessment</h2>
      }
    >
      <div className="py-12">
        <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6 md:p-8 border border-gray-100">

            {(errors.general || errors.error) && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                <strong className="font-bold">Oops!</strong>
                <ul className="mt-2 list-disc list-inside text-sm">
                  {(errors.general || errors.error || []).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assessment Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500 transition-colors duration-150"
                    required
                    placeholder="e.g., Midterm Exam - OOP"
                  />
                  {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title[0]}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Upload Source Document (PDF or TXT)</label>
                  <input
                    type="file"
                    onChange={e => setDocument(e.target.files[0])}
                    className="mt-1 block w-full text-sm text-gray-600 rounded-md border border-dashed border-gray-300 bg-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-600 hover:file:bg-red-100 focus:border-red-500 transition-colors duration-150"
                    required
                    accept=".pdf,.txt"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: Keep documents under 5MB for faster processing.</p>
                  {errors.document && <p className="text-red-600 text-sm mt-1">{errors.document[0]}</p>}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 mt-4">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Questions</label>
                  <input
                    type="number"
                    value={total}
                    onChange={e => setTotal(parseInt(e.target.value) || 0)}
                    className="w-32 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-2 focus:ring-red-500 transition-colors duration-150"
                    required
                    min="1"
                  />
                </div>

                <h3 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">Assessment Structure</h3>

                {sections.map((section, index) => (
                  <div key={index} className="flex items-center gap-4 mb-4 bg-gray-50 p-4 rounded-md border border-gray-200 transition hover:bg-gray-100">
                    <div className="font-bold text-gray-500 whitespace-nowrap">Section {index + 1}</div>

                    <div className="flex-1">
                      <select
                        value={section.type}
                        onChange={e => updateSection(index, 'type', e.target.value)}
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-2 focus:ring-red-500 transition-colors duration-150"
                      >
                        <option value="Multiple Choice">Multiple Choice</option>
                        <option value="True or False">True or False</option>
                        <option value="Enumeration">Enumeration</option>
                      </select>
                    </div>

                    <div>
                      <input
                        type="number"
                        value={section.count}
                        onChange={e => updateSection(index, 'count', e.target.value)}
                        className="w-24 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-2 focus:ring-red-500 transition-colors duration-150"
                        placeholder="Qty"
                        min="1"
                        required
                      />
                    </div>

                    {sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSection(index)}
                        className="inline-flex items-center justify-center text-red-500 hover:text-red-700 focus:outline-none rounded-full p-1 transition active:scale-95"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}

                <div className={`mb-2 text-sm font-medium ${
                  remainingQuestions === 0 ? 'text-green-600' : remainingQuestions < 0 ? 'text-red-600' : 'text-orange-500'
                }`}>
                  Questions assigned: {assignedQuestions} / {total}
                  {remainingQuestions !== 0 && (
                    <span> {remainingQuestions > 0 ? `(${remainingQuestions} remaining)` : '(Too many assigned!)'}</span>
                  )}
                </div>

                {errors.sections && <p className="text-red-600 text-sm mb-4">{errors.sections[0]}</p>}

                <button
                  type="button"
                  onClick={addSection}
                  className="mb-6 inline-flex items-center px-4 py-2 bg-gray-900 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-offset-2 active:scale-95 transition transform duration-150"
                >
                  + Add Section
                </button>
              </div>

              <div className="border-t border-gray-200 pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-6 py-3 bg-red-600 border border-transparent rounded-md font-bold text-sm text-white uppercase tracking-widest shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:scale-95 transition transform ease-in-out duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating... (This may take a minute)
                    </span>
                  ) : 'Generate Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
