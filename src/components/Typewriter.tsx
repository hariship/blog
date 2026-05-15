'use client'

import { useEffect, useState } from 'react'
import './Typewriter.css'

interface TypewriterProps {
  text: string
  /** Per-character interval in ms. Default 30. */
  speedMs?: number
  /** Delay before typing starts (ms). Useful for staggering. Default 100. */
  startDelayMs?: number
  /** Show a blinking caret while typing. Default true. */
  caret?: boolean
}

/**
 * Types `text` character-by-character on mount. SSR-safe (server renders the
 * full text for SEO; client overrides on mount). Respects prefers-reduced-motion.
 */
export default function Typewriter({
  text,
  speedMs = 30,
  startDelayMs = 100,
  caret = true,
}: TypewriterProps) {
  // Until the client-side effect runs, render the full text. This matches
  // the SSR output exactly, so there's no hydration warning. The visual
  // "blank → type in" only starts once we actually animate.
  const [typed, setTyped] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(text)
      return
    }

    setTyped('')
    let i = 0
    let id = 0
    const tick = () => {
      i++
      setTyped(text.slice(0, i))
      if (i < text.length) id = window.setTimeout(tick, speedMs)
    }
    id = window.setTimeout(tick, startDelayMs)
    return () => window.clearTimeout(id)
  }, [text, speedMs, startDelayMs])

  const isAnimating = typed !== null && typed.length < text.length

  return (
    <span className="typewriter" aria-label={text}>
      {typed === null ? text : typed}
      {caret && isAnimating && <span className="typewriter-caret" aria-hidden="true">▎</span>}
    </span>
  )
}
