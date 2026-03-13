import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../api'

export default function GuestStart() {
  const { shareCode } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [photo, setPhoto] = useState(null)
  const [stream, setStream] = useState(null)
  const [cameraError, setCameraError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [step, setStep] = useState(1) // 1: info, 2: camera

  useEffect(() => {
    return () => {
      // Cleanup camera stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError('Unable to access camera. Please allow camera permissions.')
    }
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setPhoto(dataUrl)

    // Stop camera after capture
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  const retakePhoto = useCallback(() => {
    setPhoto(null)
    startCamera()
  }, [startCamera])

  const handleContinue = () => {
    if (!name.trim()) {
      setErrors({ name: 'Name is required' })
      return
    }
    setErrors({})
    setStep(2)
    startCamera()
  }

  const handleStart = async () => {
    if (!photo) {
      setCameraError('Please take a photo before starting')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/quiz/guest/start', {
        share_code: shareCode,
        student_name: name.trim(),
        student_email: email.trim() || null,
        student_photo_url: photo
      })

      // Store attempt data in sessionStorage for the quiz page
      sessionStorage.setItem('guest_attempt', JSON.stringify({
        attempt: res.data.attempt,
        quiz: res.data.quiz,
        questions: res.data.questions
      }))

      // Request fullscreen and navigate
      try {
        await document.documentElement.requestFullscreen()
      } catch (e) {
        console.log('Fullscreen not supported or denied')
      }

      navigate(`/quiz/${shareCode}/take`)
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to start quiz'
      setErrors({ general: errorMsg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <Link to="/" className="inline-block text-2xl font-extrabold text-gray-900">
          Quiz<span className="text-red-600">Craft</span> AI
        </Link>
      </div>

      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Progress indicator */}
          <div className="bg-gray-100 p-4">
            <div className="flex items-center justify-center gap-4">
              <div className={`flex items-center gap-2 ${step >= 1 ? 'text-red-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-500'}`}>1</div>
                <span className="text-sm font-medium">Your Info</span>
              </div>
              <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-red-600' : 'bg-gray-300'}`} />
              <div className={`flex items-center gap-2 ${step >= 2 ? 'text-red-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-500'}`}>2</div>
                <span className="text-sm font-medium">Photo</span>
              </div>
            </div>
          </div>

          <div className="p-8">
            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {errors.general}
              </div>
            )}

            {step === 1 && (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter Your Details</h2>
                <p className="text-gray-500 mb-6">Please provide your information to begin the quiz.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                    />
                    <p className="text-xs text-gray-400 mt-1">We'll send your results to this email</p>
                  </div>
                </div>

                <button
                  onClick={handleContinue}
                  className="w-full mt-8 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition flex items-center justify-center gap-2"
                >
                  Continue to Photo
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Take Your Photo</h2>
                <p className="text-gray-500 mb-6">This helps verify your identity for the quiz.</p>

                <div className="relative aspect-[4/3] bg-gray-900 rounded-2xl overflow-hidden mb-6">
                  {!photo ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {cameraError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 p-4">
                          <div className="text-center text-white">
                            <svg className="w-12 h-12 mx-auto mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-sm">{cameraError}</p>
                            <button onClick={startCamera} className="mt-3 text-red-400 underline text-sm">
                              Try Again
                            </button>
                          </div>
                        </div>
                      )}
                      {/* Camera guide overlay */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-8 border-2 border-dashed border-white/50 rounded-full" />
                      </div>
                    </>
                  ) : (
                    <img src={photo} alt="Your photo" className="w-full h-full object-cover" />
                  )}
                </div>

                <canvas ref={canvasRef} className="hidden" />

                <div className="flex gap-3">
                  <button
                    onClick={() => { setStep(1); setPhoto(null); if(stream) stream.getTracks().forEach(t => t.stop()); }}
                    className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
                  >
                    Back
                  </button>
                  
                  {!photo ? (
                    <button
                      onClick={capturePhoto}
                      disabled={!stream}
                      className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Take Photo
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={retakePhoto}
                        className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
                      >
                        Retake
                      </button>
                      <button
                        onClick={handleStart}
                        disabled={loading}
                        className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                            Starting...
                          </>
                        ) : (
                          <>
                            Start Quiz
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          Quiz Code: <span className="font-mono font-semibold">{shareCode}</span>
        </p>
      </div>
    </div>
  )
}
