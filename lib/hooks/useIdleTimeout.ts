'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

interface Options {
  /** Total idle time before forced logout (ms). Default: 30 min */
  timeoutMs?: number
  /** How long before timeout to show the warning dialog (ms). Default: 5 min */
  warningMs?: number
  onTimeout: () => void
}

/**
 * Tracks user activity and fires onTimeout after timeoutMs of inactivity.
 * Shows a warning (showWarning = true) warningMs before the deadline.
 * Resets on any mouse, keyboard, scroll, or touch event.
 */
export function useIdleTimeout({
  timeoutMs = 30 * 60 * 1000,
  warningMs = 5  * 60 * 1000,
  onTimeout,
}: Options) {
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft,  setSecondsLeft]  = useState(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    if (countRef.current)   clearInterval(countRef.current)
  }, [])

  const reset = useCallback(() => {
    setShowWarning(false)
    setSecondsLeft(0)
    clearTimers()

    warningRef.current = setTimeout(() => {
      setShowWarning(true)
      setSecondsLeft(Math.round(warningMs / 1000))
      countRef.current = setInterval(() => {
        setSecondsLeft(s => (s > 1 ? s - 1 : 0))
      }, 1_000)
    }, timeoutMs - warningMs)

    timeoutRef.current = setTimeout(() => {
      clearTimers()
      onTimeout()
    }, timeoutMs)
  }, [timeoutMs, warningMs, onTimeout, clearTimers])

  useEffect(() => {
    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'pointerdown']
    EVENTS.forEach(ev => window.addEventListener(ev, reset, { passive: true }))
    reset()
    return () => {
      EVENTS.forEach(ev => window.removeEventListener(ev, reset))
      clearTimers()
    }
  }, [reset, clearTimers])

  return { showWarning, secondsLeft, extendSession: reset }
}
