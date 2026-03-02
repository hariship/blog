import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { isNotNull } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const rows = await db
      .select({ category: posts.category })
      .from(posts)
      .where(isNotNull(posts.category))

    // Get unique categories
    const categories = [...new Set(rows.map(p => p.category).filter(Boolean))]

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error in categories API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
