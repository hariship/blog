'use client'

import { ThemeProvider } from '@/contexts/ThemeContext'
import { SoundProvider } from '@/contexts/SoundContext'
import { LikesProvider } from '@/contexts/LikesContext'
import { AdminProvider } from '@/contexts/AdminContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <ThemeProvider>
        <SoundProvider>
          <LikesProvider>
            {children}
          </LikesProvider>
        </SoundProvider>
      </ThemeProvider>
    </AdminProvider>
  )
}
