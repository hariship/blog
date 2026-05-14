'use client'

import { useEffect } from 'react'
import './AckToast.css'

interface AckToastProps {
  /** Message body. When null/empty, nothing renders. */
  message: string | null
  /** Called when the auto-dismiss timer fires. */
  onDismiss: () => void
  /** Optional dismiss duration in ms. Default 1500. */
  durationMs?: number
}

/**
 * Small SYS·LOG toast styled after the TNG computer's spoken acknowledgements
 * ("Acknowledged.", "Working."). Auto-dismisses after durationMs. The parent
 * owns the message state — this component is purely presentational + timer.
 */
export default function AckToast({ message, onDismiss, durationMs = 1500 }: AckToastProps) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(t)
  }, [message, onDismiss, durationMs])

  if (!message) return null

  return (
    <div className="ack-toast" role="status" aria-live="polite">
      <span className="ack-toast-code">SYS&middot;LOG</span>
      <span className="ack-toast-msg">{message}</span>
    </div>
  )
}
