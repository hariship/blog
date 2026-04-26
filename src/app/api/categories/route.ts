import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { isNotNull } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET() {
  try {
    const rows = await db
      .select({ category: posts.category })
      .from(posts)
      .where(isNotNull(posts.category))

    const categories = [...new Set(rows.map(p => p.category).filter(Boolean))]

    const response = NextResponse.json(categories)
    response.headers.set('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    return response
  } catch (error) {
    console.error('Error in categories API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
