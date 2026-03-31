import { useEffect, useState, useRef, useCallback } from 'react'

export const useQuizProtection = (attemptId, onViolation, options = {}) => {
  const { enabled = true, maxViolations = 3 } = options
  const [violations, setViolations] = useState(0)
  const violationsRef = useRef(0)
  const lastViolationRef = useRef(0)

  const registerViolation = useCallback((type, baseMessage) => {
    const now = Date.now()

    // Avoid counting the exact same action repeatedly when keys are held down.
    if (now - lastViolationRef.current < 800) return
    lastViolationRef.current = now

    violationsRef.current += 1
    setViolations(violationsRef.current)

    if (onViolation) {
      onViolation({
        type,
        attemptId,
        violations: violationsRef.current,
        shouldAutoSubmit: violationsRef.current >= maxViolations,
        message: violationsRef.current >= maxViolations
          ? 'Quiz is being auto-submitted due to repeated violations.'
          : `${baseMessage} (${violationsRef.current}/${maxViolations})`
      })
    }
  }, [attemptId, maxViolations, onViolation])

  // Tab Switching Detection
  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        registerViolation('tab_switch', 'Warning: tab switching detected')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [enabled, registerViolation])

  // Right Click + Copy Prevention
  useEffect(() => {
    if (!enabled) return

    const handleContextMenu = (e) => {
      e.preventDefault()
      return false
    }

    const handleCopyLike = (e) => {
      e.preventDefault()
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('copy', handleCopyLike)
    document.addEventListener('cut', handleCopyLike)
    document.addEventListener('paste', handleCopyLike)
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('copy', handleCopyLike)
      document.removeEventListener('cut', handleCopyLike)
      document.removeEventListener('paste', handleCopyLike)
    }
  }, [enabled])

  // Keyboard Shortcut Detection
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase()
      const isCopyShortcut = (e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 'a'].includes(key)
      const isAltTabAttempt = e.altKey && key === 'tab'

      if (isCopyShortcut || isAltTabAttempt) {
        e.preventDefault()
        registerViolation('keyboard_shortcut', 'Warning: restricted keyboard shortcut detected')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, registerViolation])

  return {
    violations,
    resetViolations: () => {
      violationsRef.current = 0
      setViolations(0)
    }
  }
}
