import { Metadata } from 'next'
import { db } from '@/lib/db'
import { personalLogs } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import NowClient, { type LogEntry } from './NowClient'

// ISR — page cached for an hour, tagged so admin personal-log writes can
// invalidate it on demand via revalidateTag('personal-logs'). Tag name
// must match what /api/admin/personal-log* already calls.
export const revalidate = 3600

const getEntries = unstable_cache(
  async (): Promise<LogEntry[]> => {
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
  },
  ['now-page-entries'],
  { tags: ['personal-logs'], revalidate: 3600 }
)

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
