import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import api from '../../api'

export default function EditQuiz() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState(null)
  const [title, setTitle] = useState('')
  const [aiResponse, setAiResponse] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get(`/quizzes/${id}`)
      .then(res => {
        const q = res.data.quiz
        setQuiz(q)
        setTitle(q.title)
        setAiResponse(q.ai_response)
      })
      .catch(err => setErrors({ general: [err.response?.data?.message || 'Failed to load quiz.'] }))
      .finally(() => setLoading(false))
  }, [id])

  function updateQuestionText(sIdx, qIdx, value) {
    const updated = JSON.parse(JSON.stringify(aiResponse))
    updated.sections[sIdx].questions[qIdx].question_text = value
    setAiResponse(updated)
  }

  function updateOption(sIdx, qIdx, oIdx, value) {
    const updated = JSON.parse(JSON.stringify(aiResponse))
    updated.sections[sIdx].questions[qIdx].options[oIdx] = value
    setAiResponse(updated)
  }

  function updateCorrectAnswer(sIdx, qIdx, value) {
    const updated = JSON.parse(JSON.stringify(aiResponse))
    updated.sections[sIdx].questions[qIdx].correct_answer = value
    setAiResponse(updated)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    try {
      await api.patch(`/quizzes/${id}`, { title, ai_response: aiResponse })
      sessionStorage.setItem('success', 'Assessment updated successfully!')
      navigate(`/quizzes/${id}`)
    } catch (err) {
      setErrors(err.response?.data?.errors || { general: ['Something went wrong.'] })
      setSubmitting(false)
    }
  }

  if (loading) return (
    <AppLayout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div></AppLayout>
  )

  return (
    <AppLayout
      header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Edit Assessment</h2>}
    >
      <div className="py-12">
        <div className="max-w-6xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6 text-gray-900">
              {errors.general && (
                <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                  <strong className="font-bold">Oops!</strong>
                  <ul className="mt-2 list-disc list-inside text-sm">
                    {errors.general.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-8">
                  <label className="block text-lg font-semibold text-gray-900 mb-2">Assessment Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-red-500 focus:ring-red-500"
                    required
                  />
                  {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title[0]}</p>}
                </div>

                {aiResponse?.sections && (
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Edit Questions & Answers</h3>

                    {aiResponse.sections.map((section, sIdx) => (
                      <div key={sIdx} className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="text-lg font-bold text-red-600 mb-4">
                          {section.title || section.type}
                        </h4>

                        {section.questions?.map((question, qIdx) => (
                          <div key={qIdx} className="mb-6 p-4 bg-white rounded border border-gray-300">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Question {qIdx + 1}
                            </label>
                            <textarea
                              value={question.question_text || question.question || ''}
                              onChange={e => updateQuestionText(sIdx, qIdx, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-red-500 focus:ring-red-500 mb-4"
                              rows="2"
                            />

                            {question.options && Array.isArray(question.options) && (
                              <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Options</label>
                                {question.options.map((option, oIdx) => (
                                  <input
                                    key={oIdx}
                                    type="text"
                                    value={option}
                                    onChange={e => updateOption(sIdx, qIdx, oIdx, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-red-500 focus:ring-red-500 mb-2"
                                  />
                                ))}
                              </div>
                            )}

                            <label className="block text-sm font-semibold text-gray-700 mb-2">Correct Answer</label>
                            <input
                              type="text"
                              value={question.correct_answer || question.answer || ''}
                              onChange={e => updateCorrectAnswer(sIdx, qIdx, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-red-500 focus:ring-red-500"
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-6 border-t">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center px-6 py-3 bg-red-600 border border-transparent rounded-md font-bold text-sm text-white uppercase tracking-widest hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition ease-in-out duration-150 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                  <Link
                    to={`/quizzes/${id}`}
                    className="inline-flex items-center px-6 py-3 bg-gray-600 border border-transparent rounded-md font-bold text-sm text-white uppercase tracking-widest hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition ease-in-out duration-150"
                  >
                    Cancel
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
