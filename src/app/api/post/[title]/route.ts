import { db } from '@/lib/db'
import { posts, likes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'

const fetchPostByNormalizedTitle = unstable_cache(
  async (title: string) => {
    const rows = await db
      .select({
        id: posts.id,
        title: posts.title,
        normalized_title: posts.normalized_title,
        description: posts.description,
        content: posts.content,
        category: posts.category,
        image_url: posts.image_url,
        enclosure: posts.enclosure,
        pub_date: posts.pub_date,
        inkhouse_published: posts.inkhouse_published,
        likes_count: likes.likes_count,
      })
      .from(posts)
      .leftJoin(likes, eq(posts.id, likes.post_id))
      .where(eq(posts.normalized_title, title))
      .limit(1)

    return rows[0] ?? null
  },
  ['post-by-normalized-title'],
  { tags: ['posts'], revalidate: 3600 }
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ title: string }> }
) {
  const { title } = await params

  try {
    const row = await fetchPostByNormalizedTitle(title)

    if (!row) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const transformedPost = {
      id: row.id,
      title: row.title,
      normalized_title: row.normalized_title,
      description: row.description,
      content: row.content,
      category: row.category,
      image_url: row.image_url,
      enclosure: row.enclosure,
      pub_date: row.pub_date,
      inkhouse_published: row.inkhouse_published,
      likesCount: row.likes_count || 0,
    }

    const response = NextResponse.json(transformedPost)
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    return response
  } catch (error) {
    console.error('Error in post API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
