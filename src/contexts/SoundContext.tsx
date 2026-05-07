'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react'

interface SoundContextType {
  soundEnabled: boolean
  toggleSound: () => void
  playButtonSound: () => void
  playHoverSound: () => void
  playKeypadBeep: () => void
  playToggleSound: () => void
  playDropdownSound: () => void
  playNavigationSound: () => void
}

const SoundContext = createContext<SoundContextType | undefined>(undefined)

export const useSounds = () => {
  const context = useContext(SoundContext)
  if (context === undefined) {
    throw new Error('useSounds must be used within a SoundProvider')
  }
  return context
}

interface SoundProviderProps {
  children: ReactNode
}

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

export const SoundProvider: React.FC<SoundProviderProps> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
  const [mounted, setMounted] = useState(false)

  // One AudioContext for the lifetime of the provider. Created lazily on the
  // first play call so we ride a real user gesture (autoplay policy), and
  // reused for every sound thereafter — avoids the per-tab context cap and
  // the suspended-on-first-use race when navigating client-side.
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('lcars-sound-enabled')
    if (saved !== null) {
      setSoundEnabled(JSON.parse(saved))
    }
    return () => {
      audioCtxRef.current?.close().catch(() => { /* already closed */ })
      audioCtxRef.current = null
    }
  }, [])

  const getAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      // Resume is idempotent — safe to call every play. Browsers suspend the
      // context on creation (autoplay policy) and on tab blur.
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => { /* gesture not yet registered */ })
      }
      return audioCtxRef.current
    }
    try {
      const Ctor = window.AudioContext || (window as WebkitWindow).webkitAudioContext
      if (!Ctor) return null
      audioCtxRef.current = new Ctor()
      return audioCtxRef.current
    } catch {
      return null
    }
  }, [])

  const playTone = useCallback((opts: {
    freq: number
    type: OscillatorType
    duration: number
    gain: number
    rampToFreq?: number
  }) => {
    if (!soundEnabled || !mounted) return
    const ctx = getAudioContext()
    if (!ctx) return
    try {
      const oscillator = ctx.createOscillator()
      const volume = ctx.createGain()
      oscillator.connect(volume)
      volume.connect(ctx.destination)

      oscillator.frequency.setValueAtTime(opts.freq, ctx.currentTime)
      if (opts.rampToFreq !== undefined) {
        oscillator.frequency.exponentialRampToValueAtTime(opts.rampToFreq, ctx.currentTime + opts.duration)
      }
      oscillator.type = opts.type

      volume.gain.setValueAtTime(opts.gain, ctx.currentTime)
      volume.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + opts.duration)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + opts.duration)
    } catch (error) {
      console.warn('Audio not available:', error)
    }
  }, [soundEnabled, mounted, getAudioContext])

  const toggleSound = () => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    localStorage.setItem('lcars-sound-enabled', JSON.stringify(newValue))
  }

  const playHoverSound = useCallback(() => {
    playTone({ freq: 800, type: 'sine', duration: 0.03, gain: 0.03 })
  }, [playTone])

  const playKeypadBeep = useCallback(() => {
    playTone({ freq: 1200, type: 'square', duration: 0.06, gain: 0.025 })
  }, [playTone])

  const playToggleSound = useCallback(() => {
    playTone({ freq: 600, type: 'sine', duration: 0.12, gain: 0.04 })
  }, [playTone])

  const playDropdownSound = useCallback(() => {
    playTone({ freq: 800, rampToFreq: 1000, type: 'triangle', duration: 0.04, gain: 0.03 })
  }, [playTone])

  const playNavigationSound = useCallback(() => {
    playTone({ freq: 400, rampToFreq: 200, type: 'sawtooth', duration: 0.15, gain: 0.025 })
  }, [playTone])

  const playButtonSound = playKeypadBeep

  return (
    <SoundContext.Provider value={{ soundEnabled, toggleSound, playButtonSound, playHoverSound, playKeypadBeep, playToggleSound, playDropdownSound, playNavigationSound }}>
      {children}
    </SoundContext.Provider>
  )
}
