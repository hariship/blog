import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { isNotNull, ne, and, desc, max } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'

const fetchCategories = unstable_cache(
  async () => {
    const rows = await db
      .select({ category: posts.category, latest: max(posts.pub_date) })
      .from(posts)
      .where(and(isNotNull(posts.category), ne(posts.normalized_title, 'now')))
      .groupBy(posts.category)
      .orderBy(desc(max(posts.pub_date)))
    return rows.map(r => r.category).filter(Boolean)
  },
  ['categories-list'],
  { tags: ['posts'], revalidate: 3600 }
)

export async function GET() {
  try {
    const categories = await fetchCategories()
    const response = NextResponse.json(categories)
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    return response
  } catch (error) {
    console.error('Error in categories API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
