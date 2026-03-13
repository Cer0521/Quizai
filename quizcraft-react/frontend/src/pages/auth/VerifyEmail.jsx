import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'

export default function VerifyEmail() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [resendStatus, setResendStatus] = useState('')

  useEffect(() => {
    if (token) {
      const email = searchParams.get('email')
      api.get(`/auth/verify-email/${token}?email=${encodeURIComponent(email || '')}`)
        .then(res => setStatus(res.data.status))
        .catch(err => setError(err.response?.data?.message || 'Verification failed.'))
    }
  }, [token])

  async function handleResend() {
    try {
      const res = await api.post('/auth/resend-verification')
      setResendStatus(res.data.status)
    } catch {
      setResendStatus('Failed to resend.')
    }
  }

  if (!token) {
    // Show "please verify your email" prompt
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow max-w-md w-full">
          <h2 className="text-xl font-semibold mb-4">Thanks for signing up!</h2>
          <p className="text-gray-600 mb-4">
            Before getting started, could you verify your email address by clicking on the link we just emailed to you?
          </p>
          {resendStatus && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-sm">
              {resendStatus}
            </div>
          )}
          {user && (
            <button onClick={handleResend} className="text-sm text-gray-600 underline hover:text-gray-900">
              Resend verification email
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow max-w-md w-full text-center">
        {status ? (
          <>
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h2 className="text-xl font-semibold mb-2">Email Verified!</h2>
            <p className="text-gray-600 mb-4">{status}</p>
            <Link to="/dashboard" className="px-6 py-2 bg-red-600 text-white rounded-md font-bold hover:bg-red-700 transition">
              Go to Dashboard
            </Link>
          </>
        ) : error ? (
          <>
            <div className="text-red-600 text-5xl mb-4">✗</div>
            <h2 className="text-xl font-semibold mb-2">Verification Failed</h2>
            <p className="text-gray-600">{error}</p>
          </>
        ) : (
          <p className="text-gray-500">Verifying your email...</p>
        )}
      </div>
    </div>
  )
}
