import { useState, useRef, useEffect } from 'react'

/**
 * Pre-quiz gate: collects student name + webcam photo before the quiz starts.
 * Props:
 *   prefillName   — pre-filled name (from auth user), empty string for guests
 *   onComplete(name, photoBase64 | null) — called when student clicks "Begin Quiz"
 */
export default function PreQuizGate({ prefillName = '', onComplete }) {
  const [step, setStep] = useState('name') // 'name' | 'camera'
  const [name, setName] = useState(prefillName)
  const [nameError, setNameError] = useState('')
  const [stream, setStream] = useState(null)
  const [photo, setPhoto] = useState(null) // base64 data URL
  const [cameraError, setCameraError] = useState('')
  const [cameraLoading, setCameraLoading] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  // Stop camera stream when unmounting or after photo taken
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [stream])

  function handleNameNext() {
    if (!name.trim()) { setNameError('Please enter your name.'); return }
    setNameError('')
    setStep('camera')
    startCamera()
  }

  async function startCamera() {
    setCameraLoading(true)
    setCameraError('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } })
      setStream(s)
      if (videoRef.current) {
        videoRef.current.srcObject = s
      }
    } catch {
      setCameraError('Camera access denied. You can still take the quiz without a photo.')
    } finally {
      setCameraLoading(false)
    }
  }

  // When video element mounts, attach the stream
  useEffect(() => {
    if (step === 'camera' && stream && videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [step, stream])

  function takePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = 320
    canvas.height = 240
    canvas.getContext('2d').drawImage(video, 0, 0, 320, 240)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    setPhoto(dataUrl)
    // Stop stream after capture
    if (stream) stream.getTracks().forEach(t => t.stop())
    setStream(null)
  }

  function retakePhoto() {
    setPhoto(null)
    startCamera()
  }

  function handleBegin() {
    onComplete(name.trim(), photo || null)
  }

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 px-6 py-4">
          <h2 className="text-white font-bold text-lg">Before You Begin</h2>
          <p className="text-red-100 text-sm mt-0.5">
            {step === 'name' ? 'Confirm your name' : 'Take your profile photo'}
          </p>
        </div>

        <div className="p-6 space-y-5">
          {step === 'name' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNameNext()}
                  placeholder="Enter your name..."
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                {nameError && <p className="text-red-600 text-xs mt-1">{nameError}</p>}
              </div>
              <p className="text-xs text-gray-400">
                Your name and a photo will be recorded with your submission for identification purposes.
              </p>
              <button onClick={handleNameNext}
                className="w-full py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition">
                Next: Take Photo
              </button>
            </>
          )}

          {step === 'camera' && (
            <>
              <div className="relative bg-gray-100 rounded-xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
                {!photo && !cameraError && (
                  <video ref={videoRef} autoPlay playsInline muted
                    className="w-full h-full object-cover" />
                )}
                {photo && (
                  <img src={photo} alt="Your photo" className="w-full h-full object-cover" />
                )}
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <p className="text-4xl mb-2">📷</p>
                    <p className="text-sm text-gray-500">{cameraError}</p>
                  </div>
                )}
                {cameraLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" />
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex gap-3">
                {!photo && !cameraError && (
                  <button onClick={takePhoto} disabled={cameraLoading}
                    className="flex-1 py-2.5 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition disabled:opacity-50">
                    Take Photo
                  </button>
                )}
                {photo && (
                  <button onClick={retakePhoto}
                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition">
                    Retake
                  </button>
                )}
              </div>

              <button onClick={handleBegin}
                disabled={!photo && !cameraError}
                className="w-full py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
                {photo ? 'Begin Quiz' : cameraError ? 'Begin Quiz Without Photo' : 'Take a photo first'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
