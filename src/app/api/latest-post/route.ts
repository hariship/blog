import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { ne, desc } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

// Redirect to the most-recent log entry by pub_date (excluding /now).
// A plain <a href> works — the browser follows the 307.
export async function GET(request: NextRequest) {
  try {
    const rows = await db
      .select({ normalized_title: posts.normalized_title })
      .from(posts)
      .where(ne(posts.normalized_title, 'now'))
      .orderBy(desc(posts.pub_date))
      .limit(1)

    if (rows.length === 0) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    const target = new URL(`/post/${rows[0].normalized_title}`, request.url)
    const response = NextResponse.redirect(target)
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    return response
  } catch (error) {
    console.error('Error in latest-post:', error)
    return NextResponse.redirect(new URL('/', request.url))
  }
}
