import { useState, useEffect, useRef } from 'react'

export default function QuizTimer({ timeLimitMinutes, onExpire }) {
  const totalSecs = timeLimitMinutes * 60
  const [remaining, setRemaining] = useState(() => {
    const saved = sessionStorage.getItem('quiz_timer')
    return saved ? parseInt(saved) : totalSecs
  })
  const expiredRef = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1
        sessionStorage.setItem('quiz_timer', String(next))
        if (next <= 0 && !expiredRef.current) {
          expiredRef.current = true
          clearInterval(interval)
          sessionStorage.removeItem('quiz_timer')
          onExpire()
        }
        return Math.max(0, next)
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const mins = Math.floor(remaining / 60).toString().padStart(2, '0')
  const secs = (remaining % 60).toString().padStart(2, '0')
  const urgent = remaining < 60

  return (
    <div className={`flex items-center gap-1.5 font-mono font-bold text-lg px-3 py-1 rounded-lg ${urgent ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {mins}:{secs}
    </div>
  )
}
