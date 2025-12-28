'use client'

import { ThemeProvider } from '@/contexts/ThemeContext'
import { SoundProvider } from '@/contexts/SoundContext'
import { LikesProvider } from '@/contexts/LikesContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SoundProvider>
        <LikesProvider>
          {children}
        </LikesProvider>
      </SoundProvider>
    </ThemeProvider>
  )
}
