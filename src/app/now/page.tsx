import { Metadata } from 'next'
import { db } from '@/lib/db'
import { personalLogs } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import NowClient, { type LogEntry } from './NowClient'

export const dynamic = 'force-dynamic'

async function getEntries(): Promise<LogEntry[]> {
  const rows = await db
    .select({
      id: personalLogs.id,
      body: personalLogs.body,
      created_at: personalLogs.created_at,
      updated_at: personalLogs.updated_at,
    })
    .from(personalLogs)
    .orderBy(desc(personalLogs.created_at))
    .limit(100)

  return rows.map(r => ({
    id: r.id,
    body: r.body,
    created_at: r.created_at?.toISOString() || '',
    updated_at: r.updated_at?.toISOString() || null,
  }))
}

export const metadata: Metadata = {
  title: "Personal Log",
  description: "Hari's Personal Log — short entries as they happen.",
  openGraph: {
    title: "Personal Log — Hari",
    description: "Short entries as they happen.",
    url: 'https://blog.haripriya.org/now',
    type: 'article',
    siteName: "Hari's Blog",
  },
}

export default async function NowPage() {
  const entries = await getEntries()
  return <NowClient entries={entries} />
}
