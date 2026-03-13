import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../api'

export default function QuizLanding() {
  const { shareCode } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get(`/quiz/share/${shareCode}`)
      .then(res => setQuiz(res.data.quiz))
      .catch(err => setError(err.response?.data?.message || 'Quiz not found'))
      .finally(() => setLoading(false))
  }, [shareCode])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/" className="inline-block px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <Link to="/" className="inline-block text-2xl font-extrabold text-gray-900">
          Quiz<span className="text-red-600">Craft</span> AI
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Quiz Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-10 text-white">
            <div className="flex items-center gap-2 text-red-200 text-sm mb-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>By {quiz.teacher_name}</span>
            </div>
            <h1 className="text-3xl font-bold mb-3">{quiz.title}</h1>
            {quiz.description && (
              <p className="text-red-100 leading-relaxed">{quiz.description}</p>
            )}
          </div>

          {/* Quiz Details */}
          <div className="p-8">
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-gray-900">{quiz.total_questions}</div>
                <div className="text-sm text-gray-500">Questions</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {quiz.time_limit ? `${quiz.time_limit}` : '--'}
                </div>
                <div className="text-sm text-gray-500">{quiz.time_limit ? 'Minutes' : 'No Time Limit'}</div>
              </div>
              {quiz.subject && (
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-lg font-bold text-gray-900">{quiz.subject}</div>
                  <div className="text-sm text-gray-500">Subject</div>
                </div>
              )}
              {quiz.difficulty && (
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className={`text-lg font-bold capitalize ${
                    quiz.difficulty === 'easy' ? 'text-green-600' : 
                    quiz.difficulty === 'medium' ? 'text-yellow-600' : 'text-red-600'
                  }`}>{quiz.difficulty}</div>
                  <div className="text-sm text-gray-500">Difficulty</div>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
              <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Before You Start
              </h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>- You will need to provide your name and take a photo</li>
                <li>- The quiz will run in fullscreen mode</li>
                {quiz.time_limit && <li>- You have {quiz.time_limit} minutes to complete the quiz</li>}
                <li>- Your answers are auto-saved as you go</li>
                {quiz.passing_score && <li>- Passing score: {quiz.passing_score}%</li>}
              </ul>
            </div>

            {/* Start Button */}
            <button
              onClick={() => navigate(`/quiz/${shareCode}/start`)}
              className="w-full py-4 bg-red-600 text-white text-lg font-bold rounded-xl hover:bg-red-700 transition flex items-center justify-center gap-2"
            >
              Start Quiz
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          Quiz Code: <span className="font-mono font-semibold">{shareCode}</span>
        </p>
      </div>
    </div>
  )
}
