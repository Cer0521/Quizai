import { useEffect, useState, useRef, useCallback } from 'react'

export const useQuizProtection = (attemptId, onViolation, options = {}) => {
  const { enabled = true, maxFullscreenExits = 3, maxAltTabs = 3 } = options
  const [violations, setViolations] = useState(0)
  const violationsRef = useRef(0)
  const [fullscreenExits, setFullscreenExits] = useState(0)
  const [altTabAttempts, setAltTabAttempts] = useState(0)
  const fullscreenExitsRef = useRef(0)
  const altTabAttemptsRef = useRef(0)
  const lastViolationRef = useRef(0)

  const registerViolation = useCallback((type, baseMessage) => {
    const now = Date.now()

    // Avoid counting the exact same action repeatedly when keys are held down.
    if (now - lastViolationRef.current < 800) return
    lastViolationRef.current = now

    let normalizedType = type
    let typeCount = 0
    let typeLimit = 0
    let shouldAutoSubmit = false

    if (type === 'fullscreen_exit') {
      fullscreenExitsRef.current += 1
      setFullscreenExits(fullscreenExitsRef.current)
      typeCount = fullscreenExitsRef.current
      typeLimit = maxFullscreenExits
      shouldAutoSubmit = typeCount >= typeLimit
    } else if (type === 'alt_tab' || type === 'tab_switch') {
      normalizedType = 'alt_tab'
      altTabAttemptsRef.current += 1
      setAltTabAttempts(altTabAttemptsRef.current)
      typeCount = altTabAttemptsRef.current
      typeLimit = maxAltTabs
      shouldAutoSubmit = typeCount >= typeLimit
    } else {
      return
    }

    violationsRef.current = fullscreenExitsRef.current + altTabAttemptsRef.current
    setViolations(violationsRef.current)

    if (onViolation) {
      onViolation({
        type: normalizedType,
        attemptId,
        violations: violationsRef.current,
        shouldAutoSubmit,
        typeCount,
        typeLimit,
        fullscreenExits: fullscreenExitsRef.current,
        altTabAttempts: altTabAttemptsRef.current,
        message: shouldAutoSubmit
          ? 'Quiz is being auto-submitted due to repeated violations.'
          : `${baseMessage} (${typeCount}/${typeLimit})`
      })
    }
  }, [attemptId, maxAltTabs, maxFullscreenExits, onViolation])

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
    }

    const handleBeforeInput = (e) => {
      if (e.inputType === 'insertFromPaste') {
        e.preventDefault()
        e.stopPropagation()
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

      if (isCopyShortcut || isShiftInsertPaste) {
        e.preventDefault()
        return
      }

      if (isAltTabAttempt) {
        e.preventDefault()
        registerViolation('alt_tab', 'Warning: Alt+Tab/tab switch detected')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, registerViolation])

  return {
    violations,
    fullscreenExits,
    altTabAttempts,
    registerManualViolation,
    resetViolations: () => {
      violationsRef.current = 0
      fullscreenExitsRef.current = 0
      altTabAttemptsRef.current = 0
      setViolations(0)
      setFullscreenExits(0)
      setAltTabAttempts(0)
    }
  }
}
