'use client'

import { useEffect, useState } from 'react'

const DIGITS = '0123456789'
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function scrambleChar(ch: string): string {
  if (/\d/.test(ch)) return DIGITS[Math.floor(Math.random() * 10)]
  if (/[A-Z]/.test(ch)) return LETTERS[Math.floor(Math.random() * 26)]
  return ch // punctuation, spaces, lowercase — left alone
}

interface DecodedProps {
  text: string
  /** Total animation duration in ms (default 500). */
  durationMs?: number
}

/**
 * Renders `text` with a brief "computer decoding" effect on mount —
 * characters start scrambled and resolve left-to-right into the target
 * string. Punctuation and spaces are not scrambled.
 *
 * SSR-safe: server renders the real text. Client mount immediately
 * triggers the scramble, then animates back to the target. Respects
 * `prefers-reduced-motion`.
 */
export default function Decoded({ text, durationMs = 500 }: DecodedProps) {
  const [display, setDisplay] = useState(text)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    setDisplay(text.split('').map(scrambleChar).join(''))

    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const result = text
        .split('')
        .map((ch, i) => {
          // Each character resolves at its position-weighted point.
          const charProgress = t * text.length - i
          if (charProgress >= 1) return ch
          if (charProgress < 0) return scrambleChar(ch)
          return Math.random() < charProgress ? ch : scrambleChar(ch)
        })
        .join('')
      setDisplay(result)
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        setDisplay(text)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text, durationMs])

  return <>{display}</>
}
