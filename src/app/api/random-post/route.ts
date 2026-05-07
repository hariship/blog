import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { ne, sql } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

// Pure redirect endpoint — picks a random log entry (excluding /now) and
// 302s to /post/<slug>. No JSON, no client glue: a plain <a href> works.
export async function GET(request: NextRequest) {
  try {
    const rows = await db
      .select({ normalized_title: posts.normalized_title })
      .from(posts)
      .where(ne(posts.normalized_title, 'now'))
      .orderBy(sql`RANDOM()`)
      .limit(1)

    if (rows.length === 0) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    const target = new URL(`/post/${rows[0].normalized_title}`, request.url)
    const response = NextResponse.redirect(target)
    // Each request must hit the DB — don't let any layer cache the redirect.
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    return response
  } catch (error) {
    console.error('Error in random-post:', error)
    return NextResponse.redirect(new URL('/', request.url))
  }
}
