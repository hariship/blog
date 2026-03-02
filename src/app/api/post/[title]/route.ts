import { db } from '@/lib/db'
import { posts, likes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ title: string }> }
) {
  const { title } = await params

  try {
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

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const row = rows[0]
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

    return NextResponse.json(transformedPost)
  } catch (error) {
    console.error('Error in post API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
