import { Metadata } from 'next'
import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import NowClient from './NowClient'

export const dynamic = 'force-dynamic'

interface NowPost {
  title: string
  content: string
  pub_date: string
}

async function getNow(): Promise<NowPost | null> {
  const rows = await db
    .select({
      title: posts.title,
      content: posts.content,
      pub_date: posts.pub_date,
    })
    .from(posts)
    .where(eq(posts.normalized_title, 'now'))
    .limit(1)

  if (rows.length === 0) return null
  const row = rows[0]
  return {
    title: row.title,
    content: row.content,
    pub_date: row.pub_date?.toISOString() || '',
  }
}

export const metadata: Metadata = {
  title: 'Now',
  description: 'What I am currently doing, reading, thinking about.',
  openGraph: {
    title: 'Now',
    description: 'What I am currently doing, reading, thinking about.',
    url: 'https://blog.haripriya.org/now',
    type: 'article',
    siteName: "Hari's Blog",
  },
}

export default async function NowPage() {
  const post = await getNow()
  return <NowClient post={post} />
}
