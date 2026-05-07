'use client'

import './AccessingOverlay.css'

interface AccessingOverlayProps {
  /** Message shown above the dots. Defaults to "ACCESSING DATABASE". */
  message?: string
  /** When true, render as a fixed full-screen overlay. When false, render as
   * an inline panel sized to its container (used by loading.tsx files). */
  fullscreen?: boolean
}

export default function AccessingOverlay({
  message = 'ACCESSING DATABASE',
  fullscreen = false,
}: AccessingOverlayProps) {
  return (
    <div className={`accessing-root${fullscreen ? ' accessing-fullscreen' : ''}`} role="status" aria-live="polite">
      <div className="accessing-panel">
        <span className="accessing-code">SYS&middot;LOG</span>
        <p className="accessing-text">
          {message}
          <span className="accessing-dots" aria-hidden="true" />
        </p>
        <span className="accessing-bar" aria-hidden="true" />
      </div>
    </div>
  )
}
