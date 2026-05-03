import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import api from '../api'

export default function Dashboard() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [successMsg, setSuccessMsg] = useState(sessionStorage.getItem('success') || '')
  const navigate = useNavigate()

  useEffect(() => {
    if (successMsg) sessionStorage.removeItem('success')
    api.get('/quizzes')
      .then(res => setQuizzes(res.data.quizzes))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(quiz) {
    if (!confirm(`Are you sure you want to delete "${quiz.title}"? This action cannot be undone.`)) return
    try {
      await api.delete(`/quizzes/${quiz.id}`)
      setQuizzes(q => q.filter(x => x.id !== quiz.id))
    } catch {
      alert('Failed to delete assessment.')
    }
  }

  return (
    <AppLayout
      header={
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-xl text-gray-800 leading-tight">My Assessments</h2>
          <Link
            to="/quizzes/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 border border-transparent rounded-md font-bold text-xs text-white uppercase tracking-widest shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 active:scale-95 transition transform ease-in-out duration-150"
          >
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Create New Assessment</span>
          </Link>
        </div>
      }
    >
      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          {successMsg && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
              <span>{successMsg}</span>
            </div>
          )}

          <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6 text-gray-900">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assessment History</h3>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
                </div>
              ) : quizzes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>You haven't created any assessments yet.</p>
                  <p className="mt-2 text-sm">Click the button above to upload a document and get started!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {quizzes.map(quiz => (
                        <tr key={quiz.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{quiz.title}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {quiz.created_at ? quiz.created_at.split('T')[0].replace(' ', '') : ''}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/quizzes/${quiz.id}/edit`}
                                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-400 active:scale-95 transition transform duration-150"
                              >
                                <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5M18 14v4.75A1.25 1.25 0 0116.75 20H5.25A1.25 1.25 0 014 18.75V7.25A1.25 1.25 0 015.25 6H10" />
                                </svg>
                                <span className="hidden sm:inline">Edit</span>
                              </Link>

                              <Link
                                to={`/quizzes/${quiz.id}`}
                                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-400 active:scale-95 transition transform duration-150"
                                aria-label={`View and print ${quiz.title}`}
                              >
                                <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5V4.75A1.25 1.25 0 018 3.5h8a1.25 1.25 0 011.25 1.25V7.5M6.75 16.5H5.25A1.25 1.25 0 014 15.25v-5.5A1.25 1.25 0 015.25 8.5h13.5A1.25 1.25 0 0120 9.75v5.5A1.25 1.25 0 0118.75 16.5H17.25M6.75 16.5H8m0 0h8m-8 0v2.75A1.25 1.25 0 009.25 20.5h5.5A1.25 1.25 0 0016 19.25V16.5m-8 0h8" />
                                </svg>
                                <span className="hidden sm:inline">Print</span>
                              </Link>

                              <button
                                onClick={() => handleDelete(quiz)}
                                className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-400 active:scale-95 transition transform duration-150"
                                aria-label={`Delete ${quiz.title}`}
                              >
                                <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75v6.75M14.25 9.75v6.75M5.25 6.75h13.5M10.5 4.5h3A1.5 1.5 0 0115 6v.75H9V6a1.5 1.5 0 011.5-1.5zm-3 3h9a1 1 0 011 1v9.75A2.25 2.25 0 0115.25 21H8.75A2.25 2.25 0 016.5 18.75V8.5a1 1 0 011-1z" />
                                </svg>
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
