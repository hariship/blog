import { db } from '@/lib/db'
import { posts, likes } from '@/lib/db/schema'
import { eq, ilike, or, desc, count, sql } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'

// Cache the data layer per (page, limit, category, search) tuple. Tagged
// 'posts' so admin writes can invalidate every variant via revalidateTag.
const fetchPostsList = unstable_cache(
  async (page: number, limit: number, category: string | null, search: string | null) => {
    const offset = (page - 1) * limit

    const conditions = []
    if (category && category !== 'all') {
      conditions.push(eq(posts.category, category))
    }
    if (search) {
      conditions.push(
        or(
          ilike(posts.title, `%${search}%`),
          ilike(posts.description, `%${search}%`)
        )!
      )
    }
    const where = conditions.length > 0
      ? conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`
      : undefined

    const rows = await db
      .select({
        id: posts.id,
        title: posts.title,
        normalized_title: posts.normalized_title,
        description: posts.description,
        category: posts.category,
        image_url: posts.image_url,
        enclosure: posts.enclosure,
        pub_date: posts.pub_date,
        inkhouse_published: posts.inkhouse_published,
        likes_count: likes.likes_count,
      })
      .from(posts)
      .leftJoin(likes, eq(posts.id, likes.post_id))
      .where(where)
      .orderBy(desc(posts.pub_date))
      .limit(limit)
      .offset(offset)

    const [countResult] = await db
      .select({ total: count() })
      .from(posts)
      .where(where)

    return { rows, totalItems: countResult?.total || 0 }
  },
  ['posts-list'],
  { tags: ['posts'], revalidate: 3600 }
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const category = searchParams.get('category')
  const search = searchParams.get('search')

  try {
    const { rows, totalItems } = await fetchPostsList(page, limit, category, search)

    const transformedPosts = rows.map(row => ({
      id: row.id,
      title: row.title,
      normalized_title: row.normalized_title,
      description: row.description,
      category: row.category,
      image_url: row.image_url,
      enclosure: row.enclosure,
      pub_date: row.pub_date,
      inkhouse_published: row.inkhouse_published || false,
      likesCount: row.likes_count || 0,
    }))

    const response = NextResponse.json({
      posts: transformedPosts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit
      }
    })

    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return response
  } catch (error) {
    console.error('Error in posts API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
