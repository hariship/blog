'use client'

import Link from 'next/link'
import { IoIosArrowBack } from 'react-icons/io'
import { Navbar } from '@/components/layout'
import { ThemeToggle, SoundToggle } from '@/components/common'
import '../post/[title]/Post.css'
import './now.css'

export interface LogEntry {
  id: number
  body: string
  created_at: string
  updated_at: string | null
}

interface NowClientProps {
  entries: LogEntry[]
}

// "today" / "yesterday" / weekday for this week / full date otherwise.
function relativeDateHeading(iso: string, now = new Date()): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const dayMs = 86_400_000
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / dayMs)
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays > 1 && diffDays < 7) {
    return d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Group consecutive entries that share the same relativeDateHeading bucket.
function groupByDay(entries: LogEntry[]): Array<{ label: string; items: LogEntry[] }> {
  const out: Array<{ label: string; items: LogEntry[] }> = []
  for (const e of entries) {
    const label = relativeDateHeading(e.created_at)
    const last = out[out.length - 1]
    if (last && last.label === label) {
      last.items.push(e)
    } else {
      out.push({ label, items: [e] })
    }
  }
  return out
}

export default function NowClient({ entries }: NowClientProps) {
  const groups = groupByDay(entries)

  return (
    <>
      <Navbar />
      <div className="post-container now-container">
        <div className="post-header">
          <Link href="/" className="back-button" aria-label="Back to home">
            <IoIosArrowBack className="back-icon" />
          </Link>
          <div className="post-theme-toggle">
            <SoundToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="now-panel">
          <span className="now-panel-code">PERSONAL LOG &middot; HARI</span>
          <p className="now-tagline">Let&apos;s see what&apos;s out there.</p>
        </div>

        {entries.length === 0 ? (
          <div className="now-empty">
            <span className="now-empty-code">QUERY&middot;NULL</span>
            <p>No log entries yet.</p>
          </div>
        ) : (
          <div className="now-stream">
            {groups.map((group, gi) => (
              <section key={`${group.label}-${gi}`} className="now-group">
                <h2 className="now-group-label">{group.label}</h2>
                <ul className="now-entries">
                  {group.items.map(entry => (
                    <li key={entry.id} className="now-entry">
                      <p className="now-entry-body">{entry.body}</p>
                      <span className="now-entry-time" aria-hidden="true">
                        {formatTime(entry.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
