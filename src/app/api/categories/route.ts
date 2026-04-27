import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { isNotNull, desc, max } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET() {
  try {
    // Group by category, order by most recent post in each — newest activity first.
    const rows = await db
      .select({ category: posts.category, latest: max(posts.pub_date) })
      .from(posts)
      .where(isNotNull(posts.category))
      .groupBy(posts.category)
      .orderBy(desc(max(posts.pub_date)))

    const categories = rows.map(r => r.category).filter(Boolean)

    const response = NextResponse.json(categories)
    response.headers.set('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    return response
  } catch (error) {
    console.error('Error in categories API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
