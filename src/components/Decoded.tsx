'use client'

import { useEffect, useState } from 'react'

const DIGITS = '0123456789'
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'

function scrambleChar(ch: string): string {
  if (/\d/.test(ch)) return DIGITS[Math.floor(Math.random() * 10)]
  if (/[A-Z]/.test(ch)) return UPPER[Math.floor(Math.random() * 26)]
  if (/[a-z]/.test(ch)) return LOWER[Math.floor(Math.random() * 26)]
  return ch // punctuation, spaces, other unicode — left alone
}

interface DecodedProps {
  text: string
  /** Total animation duration in ms (default 500). */
  durationMs?: number
  /** Delay before scramble starts (ms). Useful for staggering. Default 0. */
  startDelayMs?: number
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
export default function Decoded({ text, durationMs = 500, startDelayMs = 0 }: DecodedProps) {
  const [display, setDisplay] = useState(text)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    let timer = 0

    timer = window.setTimeout(() => {
      setDisplay(text.split('').map(scrambleChar).join(''))

      const start = performance.now()
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
    }, startDelayMs)

    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [text, durationMs, startDelayMs])

  return <>{display}</>
}
