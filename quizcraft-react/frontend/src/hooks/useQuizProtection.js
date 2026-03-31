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

  const registerManualViolation = useCallback((type, baseMessage) => {
    if (!enabled) return
    registerViolation(type, baseMessage)
  }, [enabled, registerViolation])

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
      e.stopPropagation()
      registerViolation('clipboard_action', 'Warning: copy/paste is not allowed during quiz')
    }

    const handleBeforeInput = (e) => {
      if (e.inputType === 'insertFromPaste') {
        e.preventDefault()
        e.stopPropagation()
        registerViolation('clipboard_action', 'Warning: paste is not allowed during quiz')
      }
    }

    document.addEventListener('contextmenu', handleContextMenu, true)
    document.addEventListener('copy', handleCopyLike, true)
    document.addEventListener('cut', handleCopyLike, true)
    document.addEventListener('paste', handleCopyLike, true)
    document.addEventListener('beforeinput', handleBeforeInput, true)
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true)
      document.removeEventListener('copy', handleCopyLike, true)
      document.removeEventListener('cut', handleCopyLike, true)
      document.removeEventListener('paste', handleCopyLike, true)
      document.removeEventListener('beforeinput', handleBeforeInput, true)
    }
  }, [enabled, registerViolation])

  // Keyboard Shortcut Detection
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase()
      const isCopyShortcut = (e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 'a'].includes(key)
      const isShiftInsertPaste = e.shiftKey && key === 'insert'
      const isAltTabAttempt = e.altKey && key === 'tab'

      if (isCopyShortcut || isShiftInsertPaste || isAltTabAttempt) {
        e.preventDefault()
        registerViolation('keyboard_shortcut', 'Warning: restricted keyboard shortcut detected')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, registerViolation])

  return {
    violations,
    registerManualViolation,
    resetViolations: () => {
      violationsRef.current = 0
      setViolations(0)
    }
  }
}
