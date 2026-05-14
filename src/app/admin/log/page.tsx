'use client'

import { useEffect, useState } from 'react'
import { Navbar } from '@/components/layout'
import { ThemeToggle, SoundToggle } from '@/components/common'
import AckToast from '@/components/AckToast'
import './log.css'

interface LogEntry {
  id: number
  body: string
  created_at: string
  updated_at: string | null
}

function relativeStamp(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const date = `${months[d.getMonth()]} ${d.getDate()}`
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

export default function AdminLogPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loginPin, setLoginPin] = useState('')
  const [loginError, setLoginError] = useState('')

  const [entries, setEntries] = useState<LogEntry[]>([])
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editBody, setEditBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ack, setAck] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const token = localStorage.getItem('adminToken')
    const expiry = localStorage.getItem('adminTokenExpiry')
    if (token && expiry && new Date(expiry) > new Date()) {
      setIsAuthenticated(true)
    }
  }, [])

  const loadEntries = async () => {
    try {
      const res = await fetch('/api/personal-log?limit=100')
      const data = await res.json()
      setEntries(data.entries || [])
    } catch (err) {
      console.error('Failed to load entries:', err)
    }
  }

  useEffect(() => {
    if (isAuthenticated) loadEntries()
  }, [isAuthenticated])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPin }),
      })
      const data = await res.json()
      if (res.ok && data.token) {
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
        localStorage.setItem('adminToken', data.token)
        localStorage.setItem('adminTokenExpiry', expiry.toISOString())
        setIsAuthenticated(true)
      } else {
        setLoginError(data.error || 'Invalid PIN')
      }
    } catch {
      setLoginError('Login failed. Please try again.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminTokenExpiry')
    setIsAuthenticated(false)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch('/api/admin/personal-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body: trimmed }),
      })
      if (res.status === 401) { handleLogout(); return }
      if (res.ok) {
        setBody('')
        setAck('Logged.')
        loadEntries()
      } else {
        const data = await res.json()
        setAck(data.error || 'Failed to log.')
      }
    } catch {
      setAck('Failed to log.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSave = async (id: number) => {
    const trimmed = editBody.trim()
    if (!trimmed) return
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`/api/admin/personal-log/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body: trimmed }),
      })
      if (res.status === 401) { handleLogout(); return }
      if (res.ok) {
        setEditingId(null)
        setEditBody('')
        setAck('Updated.')
        loadEntries()
      }
    } catch {
      setAck('Update failed.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this entry? This cannot be undone.')) return
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`/api/admin/personal-log/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { handleLogout(); return }
      if (res.ok) {
        setAck('Deleted.')
        loadEntries()
      }
    } catch {
      setAck('Delete failed.')
    }
  }

  if (!mounted) return null

  if (!isAuthenticated) {
    return (
      <>
        <Navbar />
        <div className="admin-log-container">
          <div className="admin-log-login">
            <h2>Admin Access</h2>
            <form onSubmit={handleLogin}>
              <input
                type="password"
                value={loginPin}
                onChange={e => setLoginPin(e.target.value)}
                placeholder="PIN"
                autoFocus
              />
              <button type="submit">Enter</button>
            </form>
            {loginError && <p className="admin-log-error">{loginError}</p>}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <AckToast message={ack} onDismiss={() => setAck(null)} />
      <div className="admin-log-container">
        <header className="admin-log-header">
          <div className="admin-log-header-title">
            <span className="admin-log-code">PERSONAL LOG &middot; ADMIN</span>
            <h1>Make a log</h1>
          </div>
          <div className="admin-log-controls">
            <SoundToggle />
            <ThemeToggle />
            <button type="button" onClick={handleLogout} className="admin-log-logout">Logout</button>
          </div>
        </header>

        <form onSubmit={handleAdd} className="admin-log-form">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            maxLength={1000}
          />
          <div className="admin-log-form-foot">
            <span className="admin-log-counter">{body.length} / 1000</span>
            <button type="submit" disabled={isSubmitting || !body.trim()}>
              {isSubmitting ? 'Logging…' : 'Log it'}
            </button>
          </div>
        </form>

        <section className="admin-log-list">
          <h2>Recent entries</h2>
          {entries.length === 0 ? (
            <p className="admin-log-empty">No entries yet.</p>
          ) : (
            <ul>
              {entries.map(entry => (
                <li key={entry.id} className="admin-log-entry">
                  {editingId === entry.id ? (
                    <div className="admin-log-edit">
                      <textarea
                        value={editBody}
                        onChange={e => setEditBody(e.target.value)}
                        rows={3}
                        maxLength={1000}
                        autoFocus
                      />
                      <div className="admin-log-edit-actions">
                        <button type="button" onClick={() => handleEditSave(entry.id)}>Save</button>
                        <button type="button" onClick={() => { setEditingId(null); setEditBody('') }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="admin-log-entry-body">{entry.body}</p>
                      <div className="admin-log-entry-meta">
                        <span className="admin-log-entry-time">{relativeStamp(entry.created_at)}</span>
                        {entry.updated_at && <span className="admin-log-entry-edited">· edited</span>}
                        <button type="button" onClick={() => { setEditingId(entry.id); setEditBody(entry.body) }}>Edit</button>
                        <button type="button" onClick={() => handleDelete(entry.id)} className="admin-log-danger">Delete</button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
