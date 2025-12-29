'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useSounds } from '@/contexts/SoundContext'
import './Subscribe.css'

const Subscribe = () => {
  const [email, setEmail] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')
  const [messageType, setMessageType] = useState<string>('')
  const { playButtonSound, playKeypadBeep } = useSounds()

  const openModal = () => {
    playButtonSound()
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setMessage('')
    setMessageType('')
  }

  const validateEmail = (email: string): boolean => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(String(email).toLowerCase())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateEmail(email)) {
      setMessage('Please enter a valid email address')
      setMessageType('error')
      return
    }

    if (name.trim() === '') {
      setMessage('Please enter your name')
      setMessageType('error')
      return
    }

    setIsSubmitting(true)
    setMessage('')

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name,
          categories: ['all'],
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Successfully subscribed!')
        setMessageType('success')
        setEmail('')
        setName('')

        setTimeout(() => {
          closeModal()
        }, 2000)
      } else {
        setMessage(data.message || 'Failed to subscribe. Please try again.')
        setMessageType('error')
      }
    } catch (error) {
      console.error('Error subscribing:', error)
      setMessage('An error occurred. Please try again later.')
      setMessageType('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="subscribe-container">
      <button className="subscribe-icon-btn" onClick={openModal} title="Subscribe to Newsletter">
        <Plus size={18} />
      </button>

      {isModalOpen && (
        <div className="subscribe-modal-overlay">
          <div className="subscribe-modal">
            <div className="subscribe-modal-header">
              <h2>Subscribe to Newsletter</h2>
              <button className="close-modal-button" onClick={closeModal}>
                &times;
              </button>
            </div>

            <div className="subscribe-modal-content">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key.length === 1 || e.key === 'Backspace') {
                        playKeypadBeep()
                      }
                    }}
                    placeholder="Enter your name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key.length === 1 || e.key === 'Backspace') {
                        playKeypadBeep()
                      }
                    }}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                {message && (
                  <div className={`message ${messageType}`}>
                    {message}
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="submit"
                    className="submit-button"
                    disabled={isSubmitting}
                    onClick={() => playButtonSound()}
                  >
                    {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Subscribe
