import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'
import GuestLayout from '../../components/GuestLayout'

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
      <GuestLayout title="Check your email" subtitle="Click the link we sent to verify your account">
        <div className="text-center">
          {resendStatus && (
            <div className="mb-4 text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg text-sm">
              {resendStatus}
            </div>
          )}
          {user && (
            <button onClick={handleResend} className="text-sm text-brand-600 hover:underline font-medium">
              Resend verification email
            </button>
          )}
        </div>
      </GuestLayout>
    )
  }

  return (
    <GuestLayout>
      <div className="text-center py-4">
        {status ? (
          <>
            <div className="text-4xl mb-3">✓</div>
            <h2 className="text-lg font-semibold mb-2">Email verified!</h2>
            <Link to="/dashboard" className="btn-primary inline-block">Go to dashboard</Link>
          </>
        ) : error ? (
          <>
            <div className="text-4xl mb-3">✗</div>
            <h2 className="text-lg font-semibold mb-2 text-red-700">Verification failed</h2>
            <p className="text-sm text-gray-500">The link may have expired.</p>
          </>
        ) : (
          <p className="text-gray-500 text-sm">Verifying your email...</p>
        )}
      </div>
    </GuestLayout>
  )
}
