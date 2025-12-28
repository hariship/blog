'use client'

import { useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { useSounds } from '@/contexts/SoundContext'
import { usePathname } from 'next/navigation'

interface CommentsWidgetProps {
  pageSlug?: string
}

const CommentsWidget = ({ pageSlug }: CommentsWidgetProps) => {
  const { theme } = useTheme()
  const { playKeypadBeep, playButtonSound } = useSounds()
  const pathname = usePathname()

  useEffect(() => {
    const script = document.createElement('script')
    script.src = `${process.env.NEXT_PUBLIC_BLOG_EXTRAS_URL}/widget.js`
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  useEffect(() => {
    const applyThemeToComments = () => {
      const commentsContainer = document.getElementById('blogextras-comments')
      if (commentsContainer) {
        if (theme === 'dark') {
          commentsContainer.style.setProperty('background-color', 'var(--color-bg-card)', 'important')
          commentsContainer.style.setProperty('color', 'var(--color-text-primary)', 'important')
        } else {
          commentsContainer.style.setProperty('background-color', 'var(--color-bg-card)', 'important')
          commentsContainer.style.setProperty('color', 'var(--color-text-primary)', 'important')
        }

        const allElements = commentsContainer.querySelectorAll('*')
        allElements.forEach((element) => {
          if (element instanceof HTMLElement) {
            element.style.setProperty('background-color', 'var(--color-bg-card)', 'important')
            element.style.setProperty('color', 'var(--color-text-primary)', 'important')
            element.style.setProperty('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI", system-ui, ui-sans-serif, Helvetica, Arial, sans-serif', 'important')
          }
        })

        // Add placeholders to input fields
        const nameInput = commentsContainer.querySelector('input[type="text"]') as HTMLInputElement
        const emailInput = commentsContainer.querySelector('input[type="email"]') as HTMLInputElement
        const commentTextarea = commentsContainer.querySelector('textarea') as HTMLTextAreaElement

        if (nameInput && !nameInput.placeholder) {
          nameInput.placeholder = 'Name'
        }
        if (emailInput && !emailInput.placeholder) {
          emailInput.placeholder = 'Email'
        }
        if (commentTextarea && !commentTextarea.placeholder) {
          commentTextarea.placeholder = 'Write your comment...'
        }

        const inputFields = commentsContainer.querySelectorAll('input[type="text"], input[type="email"], textarea')
        inputFields.forEach((input) => {
          if (input instanceof HTMLElement) {
            input.addEventListener('keydown', (e: Event) => {
              const keyEvent = e as KeyboardEvent
              if (keyEvent.key.length === 1 || keyEvent.key === 'Backspace') {
                playKeypadBeep()
              }
            })
          }
        })

        const submitButtons = commentsContainer.querySelectorAll('button, input[type="submit"], .submit-button, .btn, [class*="submit"], [class*="post"], [class*="send"], [class*="button"]')
        submitButtons.forEach((button) => {
          if (button instanceof HTMLElement) {
            button.addEventListener('click', () => {
              playButtonSound()
            })
            const bgColor = theme === 'dark' ? '#6b7280' : '#374151'

            button.style.setProperty('background-color', bgColor, 'important')
            button.style.setProperty('background', bgColor, 'important')
            button.style.setProperty('color', '#ffffff', 'important')
            button.style.setProperty('border', `1px solid ${bgColor}`, 'important')
            button.style.setProperty('border-radius', '4px', 'important')
            button.style.setProperty('padding', '8px 16px', 'important')
            button.style.setProperty('cursor', 'pointer', 'important')
            button.style.setProperty('font-weight', '500', 'important')
          }
        })
      }
    }

    const timer1 = setTimeout(applyThemeToComments, 1000)
    const timer2 = setTimeout(applyThemeToComments, 3000)
    const timer3 = setTimeout(applyThemeToComments, 5000)

    const commentsContainer = document.getElementById('blogextras-comments')
    if (commentsContainer) {
      const observer = new MutationObserver(applyThemeToComments)
      observer.observe(commentsContainer, { childList: true, subtree: true })

      return () => {
        observer.disconnect()
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
      }
    }

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [theme, playKeypadBeep, playButtonSound])

  return (
    <div
      id="blogextras-comments"
      data-website-id="eb663e71-296b-4665-a1c4-83fba4579887"
      data-page-slug={pageSlug || pathname}
      data-api-url={process.env.NEXT_PUBLIC_BLOG_EXTRAS_URL}
      data-theme={theme}
      style={{
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    ></div>
  )
}

export default CommentsWidget
