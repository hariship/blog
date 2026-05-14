import { db } from '@/lib/db'
import { personalLogs } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'

// Tag-cached list of /now stream entries. Admin writes call
// revalidateTag('personal-logs') to invalidate every variant.
const fetchPersonalLogs = unstable_cache(
  async (limit: number, offset: number) => {
    const rows = await db
      .select({
        id: personalLogs.id,
        body: personalLogs.body,
        created_at: personalLogs.created_at,
        updated_at: personalLogs.updated_at,
      })
      .from(personalLogs)
      .orderBy(desc(personalLogs.created_at))
      .limit(limit)
      .offset(offset)
    return rows
  },
  ['personal-logs-list'],
  { tags: ['personal-logs'], revalidate: 3600 }
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 200)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  try {
    const rows = await fetchPersonalLogs(limit, offset)
    const response = NextResponse.json({ entries: rows })
    // Same reasoning as /api/posts: no CDN caching; unstable_cache is the
    // source of truth and revalidateTag drives invalidation.
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    return response
  } catch (error) {
    console.error('Error in personal-log API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
