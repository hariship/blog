import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { sendNewsletterToSubscribers } from '@/lib/newsletter'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-jwt-key'

function verifyToken(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  try {
    jwt.verify(authHeader.split(' ')[1], JWT_SECRET)
    return true
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  if (!verifyToken(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { postId } = await request.json()
    if (!postId || typeof postId !== 'number') {
      return NextResponse.json({ error: 'postId (number) is required' }, { status: 400 })
    }

    const [post] = await db
      .select({
        title: posts.title,
        description: posts.description,
        normalized_title: posts.normalized_title,
        enclosure: posts.enclosure,
        category: posts.category,
        content: posts.content,
      })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const result = await sendNewsletterToSubscribers(post)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Send newsletter error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to send newsletter', details: message }, { status: 500 })
  }
}
