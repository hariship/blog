import { db } from '@/lib/db'
import { posts, likes } from '@/lib/db/schema'
import { eq, ne, desc } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'

const fetchRssData = unstable_cache(
  async () => {
    const rows = await db
      .select({
        title: posts.title,
        normalized_title: posts.normalized_title,
        description: posts.description,
        image_url: posts.image_url,
        pub_date: posts.pub_date,
        category: posts.category,
        likes_count: likes.likes_count,
      })
      .from(posts)
      .leftJoin(likes, eq(posts.id, likes.post_id))
      .where(ne(posts.normalized_title, 'now'))
      .orderBy(desc(posts.pub_date))

    return rows.map(row => ({
      title: row.title,
      normalized_title: row.normalized_title,
      description: row.description,
      image_url: row.image_url,
      pubDate: row.pub_date,
      category: row.category,
      likesCount: row.likes_count || 0,
      isLiked: false, // Client will merge with localStorage
    }))
  },
  ['rss-feed'],
  { tags: ['posts'], revalidate: 604800 }
)

export async function GET() {
  try {
    const transformedPosts = await fetchRssData()
    const response = NextResponse.json(transformedPosts)
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    return response
  } catch (error) {
    console.error('Error in RSS API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
