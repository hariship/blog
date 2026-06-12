import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { ne, desc } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'

// Redirect to the most-recent log entry by pub_date (excluding /now).
// A plain <a href> works — the browser follows the 307.

// Cache the slug lookup. Revalidates every 10 min, OR immediately when an
// admin write invalidates the 'posts' tag.
const fetchLatestSlug = unstable_cache(
  async () => {
    const rows = await db
      .select({ normalized_title: posts.normalized_title })
      .from(posts)
      .where(ne(posts.normalized_title, 'now'))
      .orderBy(desc(posts.pub_date))
      .limit(1)
    return rows[0]?.normalized_title ?? null
  },
  ['latest-post-slug'],
  { tags: ['posts'], revalidate: 600 }
)

export async function GET(request: NextRequest) {
  try {
    const slug = await fetchLatestSlug()

    if (!slug) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    const target = new URL(`/post/${slug}`, request.url)
    const response = NextResponse.redirect(target)
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    return response
  } catch (error) {
    console.error('Error in latest-post:', error)
    return NextResponse.redirect(new URL('/', request.url))
  }
}
