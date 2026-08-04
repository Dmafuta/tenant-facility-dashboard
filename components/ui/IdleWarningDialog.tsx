'use client'
import { Clock } from 'lucide-react'

interface Props {
  secondsLeft: number
  onStayLoggedIn: () => void
  onLogout: () => void
}

/**
 * Modal shown when the user has been idle for (timeout - warningMs).
 * Counts down to automatic logout.
 */
export function IdleWarningDialog({ secondsLeft, onStayLoggedIn, onLogout }: Props) {
  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const display = mins > 0
    ? `${mins}m ${secs.toString().padStart(2, '0')}s`
    : `${secs}s`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-steel-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 border border-amber-200">
          <Clock className="h-5 w-5 text-amber-600" />
        </div>

        <h2 className="text-base font-semibold text-steel-900">Session expiring soon</h2>
        <p className="mt-1 text-sm text-steel-500">
          You've been inactive. You'll be signed out automatically in:
        </p>

        <div className="my-4 text-center">
          <span className="font-mono text-3xl font-bold tabular-nums text-amber-600">
            {display}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 rounded-lg border border-steel-200 bg-white px-4 py-2 text-sm font-medium text-steel-700 hover:bg-steel-50"
          >
            Sign out now
          </button>
          <button
            onClick={onStayLoggedIn}
            className="flex-1 rounded-lg bg-steel-900 px-4 py-2 text-sm font-medium text-white hover:bg-steel-800"
          >
            Stay logged in
          </button>
        </div>
      </div>
    </div>
  )
}
