'use client'

import Link from 'next/link'
import { IoIosArrowBack } from 'react-icons/io'
import { Navbar } from '@/components/layout'
import { ThemeToggle, SoundToggle } from '@/components/common'
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
    <div className="rv rv-page rv-now">
      <Navbar />
      <div className="rv-pageWrap">
        <div className="rv-pageCol">
          <div className="rv-postTop">
            <div className="rv-grp">
              <Link href="/" className="rv-ibtn" aria-label="Back to home" data-tip="Home">
                <IoIosArrowBack size={16} />
              </Link>
              <span className="rv-label rv-kicker">Personal log &middot; <b>Hari</b></span>
            </div>
            <div className="rv-grp">
              <SoundToggle />
              <ThemeToggle />
            </div>
          </div>

          <h1 className="rv-pageTitle">Personal Log</h1>
          <div className="rv-pageSub">Short entries as they happen{entries.length > 0 && <> &middot; {entries.length} entries</>}</div>
          <hr className="rv-titleRule" />

          {entries.length === 0 ? (
            <div className="rv-empty">
              <div className="rv-label">QUERY&middot;NULL</div>
              <p className="rv-emptyTitle">No log entries yet.</p>
            </div>
          ) : (
            <div className="rv-logStream">
              {groups.map((group, gi) => (
                <section key={`${group.label}-${gi}`} className="rv-logGroup">
                  <h2 className="rv-logDay">{group.label}</h2>
                  <ul className="rv-logEntries">
                    {group.items.map(entry => (
                      <li key={entry.id} className="rv-logEntry">
                        <p className="rv-logBody">{entry.body}</p>
                        <span className="rv-logTime" aria-hidden="true" suppressHydrationWarning>
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
      </div>
    </div>
  )
}
