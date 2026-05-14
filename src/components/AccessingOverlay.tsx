'use client'

import './AccessingOverlay.css'

interface AccessingOverlayProps {
  /** Message shown above the dots. Defaults to "ACCESSING DATABASE". */
  message?: string
  /** When true, render as a fixed full-screen overlay. When false, render as
   * an inline panel sized to its container (used by loading.tsx files). */
  fullscreen?: boolean
  /** Boot mode — softer first-visit welcome with optional entry count.
   * Used once per session on first home-page visit. */
  boot?: boolean
  /** Total log entries indexed. Only rendered when boot is true and > 0. */
  entryCount?: number
}

export default function AccessingOverlay({
  message = 'ACCESSING DATABASE',
  fullscreen = false,
  boot = false,
  entryCount,
}: AccessingOverlayProps) {
  const effectiveMessage = boot ? 'Welcome' : message
  return (
    <div className={`accessing-root${fullscreen ? ' accessing-fullscreen' : ''}${boot ? ' accessing-boot' : ''}`} role="status" aria-live="polite">
      <div className="accessing-panel">
        <span className="accessing-code">SYS&middot;LOG</span>
        <p className="accessing-text">
          {effectiveMessage}
          <span className="accessing-dots" aria-hidden="true" />
        </p>
        {boot && typeof entryCount === 'number' && entryCount > 0 && (
          <span className="accessing-meta">{entryCount} entries since 2020</span>
        )}
        {boot && (
          <span className="accessing-progress" aria-hidden="true">
            <span className="accessing-progress-fill" />
          </span>
        )}
        <span className="accessing-bar" aria-hidden="true" />
      </div>
    </div>
  )
}
