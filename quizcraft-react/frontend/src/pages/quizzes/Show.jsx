import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import api from '../../api'

export default function ShowQuiz() {
  const { id } = useParams()
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/quizzes/${id}`)
      .then(res => setQuiz(res.data.quiz))
      .catch(err => setError(err.response?.data?.message || 'Failed to load quiz.'))
      .finally(() => setLoading(false))
  }, [id])

  function formatQuestionnaireContent() {
    if (!quiz) return ''
    let content = `${quiz.title}\n${'='.repeat(quiz.title.length)}\n`
    content += `Total Questions: ${quiz.total_questions}\n\n`
    if (quiz.ai_response?.sections) {
      quiz.ai_response.sections.forEach((section, sIdx) => {
        content += `\nSECTION ${sIdx + 1}: ${section.title || section.type}\n`
        content += `${'─'.repeat(50)}\n\n`
        if (section.questions) {
          section.questions.forEach((question, qIdx) => {
            const qNum = sIdx * 100 + qIdx + 1
            content += `${qNum}. ${question.question_text || question.question}\n`
            if (question.options && Array.isArray(question.options)) {
              question.options.forEach((option, oIdx) => {
                content += `   ${String.fromCharCode(65 + oIdx)}) ${option}\n`
              })
            }
            content += '\n'
          })
        }
      })
    }
    return content
  }

  function formatAnswerKeyContent() {
    if (!quiz) return ''
    let content = `ANSWER KEY: ${quiz.title}\n`
    content += `${'='.repeat(30 + quiz.title.length)}\n\n`
    if (quiz.ai_response?.sections) {
      quiz.ai_response.sections.forEach((section, sIdx) => {
        content += `\nSECTION ${sIdx + 1}: ${section.title || section.type}\n`
        content += `${'─'.repeat(50)}\n\n`
        if (section.questions) {
          section.questions.forEach((question, qIdx) => {
            const qNum = sIdx * 100 + qIdx + 1
            content += `${qNum}. ${question.correct_answer || question.answer || 'N/A'}\n`
          })
        }
        content += '\n'
      })
    }
    return content
  }

  function copyToClipboard() {
    const content = formatQuestionnaireContent()
    navigator.clipboard.writeText(content)
      .then(() => alert('Assessment copied to clipboard (without answer key)!'))
      .catch(() => alert('Failed to copy to clipboard'))
  }

  function downloadFile(content, filename) {
    const el = document.createElement('a')
    el.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content))
    el.setAttribute('download', filename)
    el.style.display = 'none'
    document.body.appendChild(el)
    el.click()
    document.body.removeChild(el)
  }

  function exportAsText() {
    downloadFile(formatQuestionnaireContent(), `${quiz.title}_Questionnaire.txt`)
    setTimeout(() => {
      downloadFile(formatAnswerKeyContent(), `${quiz.title}_Answer_Key.txt`)
    }, 500)
  }

  if (loading) return (
    <AppLayout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div></AppLayout>
  )

  if (error) return (
    <AppLayout><div className="max-w-4xl mx-auto px-6 py-12 text-red-600">{error}</div></AppLayout>
  )

  return (
    <AppLayout
      header={
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h2 className="font-semibold text-xl text-gray-800 leading-tight">{quiz.title}</h2>
          <div className="flex gap-2 flex-wrap no-print">
            <Link
              to={`/quizzes/${quiz.id}/edit`}
              className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-md text-sm font-bold hover:bg-yellow-600 border border-yellow-600 shadow"
            >
              Edit
            </Link>
            <button onClick={copyToClipboard} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 border border-blue-700 shadow">
              Copy to Clipboard
            </button>
            <button onClick={exportAsText} className="px-4 py-2 bg-teal-600 text-white rounded-md text-sm font-bold hover:bg-teal-700 border border-teal-700 shadow">
              Export as Text
            </button>
            <button onClick={() => window.print()} className="px-4 py-2 bg-gray-800 text-white rounded-md text-sm font-bold hover:bg-gray-700 border border-gray-900 shadow">
              Print / Save PDF
            </button>
          </div>
        </div>
      }
    >
      <div className="py-12">
        <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-8" id="printable-area">
            <div className="text-center mb-8 border-b pb-4">
              <h1 className="text-3xl font-bold uppercase">{quiz.title}</h1>
              <p className="text-gray-600 mt-2">Total Questions: {quiz.total_questions}</p>
            </div>

            {quiz.ai_response?.sections ? (
              quiz.ai_response.sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="mb-10">
                  <h3 className="text-xl font-bold text-red-600 mb-4 uppercase">
                    {section.title || section.type}
                  </h3>
                  <div className="space-y-6">
                    {section.questions?.map((question, qIndex) => (
                      <div key={qIndex} className="pl-4">
                        <p className="font-medium text-gray-900">
                          {qIndex + 1}. {question.question_text || question.question}
                        </p>
                        {question.options && Array.isArray(question.options) && (
                          <ul className="mt-2 list-none pl-4 space-y-1">
                            {question.options.map((option, oIndex) => (
                              <li key={oIndex} className="text-gray-700 flex items-center gap-2">
                                <div className="w-4 h-4 border border-gray-400 rounded-full flex-shrink-0"></div>
                                {option}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-3 inline-block bg-red-50 text-red-700 px-3 py-1 rounded text-sm font-semibold">
                          Answer: {question.correct_answer || question.answer || 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-red-500">Error: Could not parse the assessment data. The AI may have returned an invalid format.</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
