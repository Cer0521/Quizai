import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../../components/AppLayout'
import api from '../../../api'
import { useAuth } from '../../../contexts/AuthContext'

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin

// ── Publish Settings Modal ────────────────────────────
function PublishSettingsModal({ quiz, onClose, onPublished }) {
  const [timerMinutes, setTimerMinutes] = useState(quiz.time_limit ? Math.round(quiz.time_limit) : 0)
  const [showScore, setShowScore] = useState(quiz.show_score !== 0)
  const [saving, setSaving] = useState(false)
  const [shareLink, setShareLink] = useState(quiz.is_published && quiz.share_token ? `${APP_URL}/quiz/${quiz.share_token}` : null)
  const [copied, setCopied] = useState(false)

  async function handlePublish() {
    setSaving(true)
    try {
      // Save settings first
      await api.patch(`/quizzes/${quiz.id}`, {
        title: quiz.title,
        time_limit: timerMinutes > 0 ? timerMinutes : null,
        show_score: showScore ? 1 : 0,
      })
      // Toggle publish (will generate share token)
      const res = await api.post(`/quizzes/${quiz.id}/publish`)
      const link = `${APP_URL}/quiz/${res.data.share_token}`
      setShareLink(link)
      onPublished(quiz.id, res.data.is_published, res.data.share_token, timerMinutes > 0 ? timerMinutes : null, showScore ? 1 : 0)
    } finally {
      setSaving(false)
    }
  }

  async function handleUnpublish() {
    setSaving(true)
    try {
      const res = await api.post(`/quizzes/${quiz.id}/publish`)
      onPublished(quiz.id, res.data.is_published, res.data.share_token, quiz.time_limit, quiz.show_score)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-800 text-lg">Quiz Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-500 font-medium truncate">{quiz.title}</p>

          {/* Timer */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Time Limit (minutes)</label>
            <input type="number" min="0" max="300" value={timerMinutes}
              onChange={e => setTimerMinutes(Number(e.target.value))}
              placeholder="0 = no limit"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500" />
            <p className="text-xs text-gray-400 mt-1">Set 0 for no time limit.</p>
          </div>

          {/* Show Score */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-semibold text-gray-700">Show Score to Students</p>
              <p className="text-xs text-gray-400 mt-0.5">If off, students only see "Submitted" after finishing.</p>
            </div>
            <button onClick={() => setShowScore(s => !s)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showScore ? 'bg-red-600' : 'bg-gray-300'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${showScore ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Share link (shown after publishing) */}
          {shareLink && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-700 mb-1.5">Share Link</p>
              <div className="flex gap-2">
                <input readOnly value={shareLink}
                  className="flex-1 text-xs bg-white border border-green-300 rounded px-2 py-1.5 text-gray-700 truncate" />
                <button onClick={copyLink}
                  className={`px-3 py-1.5 text-xs font-bold rounded transition ${copied ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {quiz.is_published
            ? <button onClick={handleUnpublish} disabled={saving}
                className="flex-1 py-2.5 border border-red-300 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition disabled:opacity-50">
                {saving ? 'Saving...' : 'Unpublish'}
              </button>
            : <button onClick={handlePublish} disabled={saving}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-50">
                {saving ? 'Publishing...' : shareLink ? 'Update & Publish' : 'Publish Quiz'}
              </button>
          }
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition">
            {shareLink ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Quiz List ────────────────────────────────────
export default function QuizList() {
  const { canAccessFeature } = useAuth()
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [flash, setFlash] = useState(sessionStorage.getItem('flash') || '')
  const [publishModal, setPublishModal] = useState(null) // the quiz object being configured
  const canUseBlueprinting = canAccessFeature('blueprinting')
  const canUseAnalytics = canAccessFeature('analytics_dashboard')

  useEffect(() => {
    sessionStorage.removeItem('flash')
    api.get('/quizzes').then(r => setQuizzes(r.data.quizzes)).finally(() => setLoading(false))
  }, [])

  function handlePublished(id, isPublished, shareToken, timeLimit, showScore) {
    setQuizzes(q => q.map(x => x.id === id
      ? { ...x, is_published: isPublished, share_token: shareToken, time_limit: timeLimit, show_score: showScore }
      : x
    ))
    // If just published, update the modal quiz too so share link shows
    setPublishModal(prev => prev?.id === id ? { ...prev, is_published: isPublished, share_token: shareToken } : prev)
  }

  function openPublishModal(quiz) {
    setPublishModal(quiz)
  }

  async function deleteQuiz(id) {
    if (!confirm('Delete this quiz? This cannot be undone.')) return
    await api.delete(`/quizzes/${id}`)
    setQuizzes(q => q.filter(x => x.id !== id))
  }

  function copyShareLink(shareToken) {
    const link = `${APP_URL}/quiz/${shareToken}`
    navigator.clipboard.writeText(link).catch(() => {})
    // Brief visual feedback via flash
    setFlash('Share link copied!')
    setTimeout(() => setFlash(''), 2000)
  }

  return (
    <AppLayout header={
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">My Quizzes</h2>
        <div className="flex gap-2">
          {canUseBlueprinting
            ? <Link to="/teacher/quizzes/generate" className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition">✨ AI Generate</Link>
            : <Link to="/pricing" className="px-3 py-1.5 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition">🔒 AI Generate</Link>
          }
          <Link to="/teacher/quizzes/create" className="px-3 py-1.5 text-xs font-bold bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition">+ Manual</Link>
        </div>
      </div>
    }>
      {publishModal && (
        <PublishSettingsModal
          quiz={publishModal}
          onClose={() => setPublishModal(null)}
          onPublished={handlePublished}
        />
      )}
      {flash && <div className="mb-4 bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg text-sm">{flash}</div>}
      {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" /></div> : (
        quizzes.length === 0 ? (
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
                  <th className="px-4 py-3">Assigned</th>
                  <th className="px-4 py-3">Status</th>
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
                    <td className="px-4 py-3 text-gray-600">{q.assigned_count}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${q.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {q.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{q.created_at?.split('T')[0]}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <Link to={`/teacher/quizzes/${q.id}/edit`} className="text-xs text-blue-600 hover:underline">Edit</Link>
                        <Link to={`/teacher/quizzes/${q.id}/assign`} className="text-xs text-green-600 hover:underline">Assign</Link>
                        {canUseAnalytics
                          ? <Link to={`/teacher/quizzes/${q.id}/analytics`} className="text-xs text-purple-600 hover:underline">Analytics</Link>
                          : <Link to="/pricing" className="text-xs text-amber-600 hover:underline">🔒 Analytics</Link>
                        }
                        <button onClick={() => openPublishModal(q)} className="text-xs text-orange-600 hover:underline">
                          {q.is_published ? 'Settings' : 'Publish'}
                        </button>
                        {q.is_published && q.share_token && (
                          <button onClick={() => copyShareLink(q.share_token)} className="text-xs text-teal-600 hover:underline">
                            Copy Link
                          </button>
                        )}
                        <button onClick={() => deleteQuiz(q.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </AppLayout>
  )
}
