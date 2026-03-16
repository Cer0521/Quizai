import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../../components/AppLayout'
import api from '../../../api'

export default function QuizList() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [flash, setFlash] = useState(sessionStorage.getItem('flash') || '')
  const [copiedCode, setCopiedCode] = useState(null)

  useEffect(() => {
    sessionStorage.removeItem('flash')
    api.get('/api/quizzes').then(r => setQuizzes(r.data.quizzes)).finally(() => setLoading(false))
  }, [])

  async function togglePublish(id, current) {
    await api.post(`/api/quizzes/${id}/publish`)
    setQuizzes(q => q.map(x => x.id === id ? { ...x, is_published: current ? 0 : 1 } : x))
  }

  async function deleteQuiz(id) {
    if (!confirm('Delete this quiz? This cannot be undone.')) return
    await api.delete(`/api/quizzes/${id}`)
    setQuizzes(q => q.filter(x => x.id !== id))
  }

  function copyShareCode(code) {
    navigator.clipboard.writeText(`${window.location.origin}/guest/quiz/${code}`)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <AppLayout header={
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">My Quizzes</h2>
        <div className="flex gap-2">
          <Link to="/teacher/quizzes/generate" className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition">✨ AI Generate</Link>
          <Link to="/teacher/quizzes/create" className="px-3 py-1.5 text-xs font-bold bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition">+ Manual</Link>
        </div>
      </div>
    }>
      {flash && <div className="mb-4 bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg text-sm">{flash}</div>}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📝</p>
          <p className="text-lg mb-2">No quizzes yet</p>
          <Link to="/teacher/quizzes/generate" className="text-red-600 hover:underline text-sm">Generate your first quiz with AI →</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Questions</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Share Code</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((q, i) => (
                <tr key={q.id} className={`border-b last:border-0 hover:bg-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">{q.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${q.source_type === 'ai' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {q.source_type === 'ai' ? '✨ AI' : '✏️ Manual'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{q.total_questions}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${q.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {q.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {q.share_code ? (
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{q.share_code}</code>
                        <button
                          onClick={() => copyShareCode(q.share_code)}
                          className="text-xs text-blue-600 hover:text-blue-700"
                          title="Copy share link"
                        >
                          {copiedCode === q.share_code ? '✓ Copied' : '📋'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{q.created_at?.split('T')[0]}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      <Link to={`/teacher/quizzes/${q.id}/edit`} className="text-xs text-blue-600 hover:underline">Edit</Link>
                      <Link to={`/teacher/quizzes/${q.id}/analytics`} className="text-xs text-purple-600 hover:underline">Analytics</Link>
                      {q.share_code && (
                        <a
                          href={`/guest/quiz/${q.share_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-600 hover:underline"
                        >
                          Share
                        </a>
                      )}
                      <button
                        onClick={() => togglePublish(q.id, q.is_published)}
                        className="text-xs text-orange-600 hover:underline"
                      >
                        {q.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={() => deleteQuiz(q.id)} className="text-xs text-red-600 hover:underline">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  )
}
