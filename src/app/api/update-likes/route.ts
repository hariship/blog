import { db } from '@/lib/db'
import { posts, likes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { postTitle, increment } = await request.json()

    if (!postTitle) {
      return NextResponse.json({ error: 'Post title is required' }, { status: 400 })
    }

    // Get the post ID from normalized title
    const postRows = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.normalized_title, postTitle))
      .limit(1)

    if (postRows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const postId = postRows[0].id

    // Get current likes count
    const likesRows = await db
      .select({ likes_count: likes.likes_count })
      .from(likes)
      .where(eq(likes.post_id, postId))
      .limit(1)

    const currentCount = likesRows[0]?.likes_count || 0
    const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1)

    // Update or insert likes
    if (likesRows.length > 0) {
      await db
        .update(likes)
        .set({ likes_count: newCount })
        .where(eq(likes.post_id, postId))
    } else {
      await db
        .insert(likes)
        .values({ post_id: postId, likes_count: newCount })
    }

    return NextResponse.json({ success: true, likesCount: newCount })
  } catch (error) {
    console.error('Error in update-likes API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
