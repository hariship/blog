import { db } from '@/lib/db'
import { posts, likes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import jwt from 'jsonwebtoken'

function invalidateBlogCaches(normalizedTitle?: string) {
  // Tag-based invalidation: clears every variant of /api/posts and
  // /api/categories that uses the 'posts' tag in unstable_cache.
  revalidateTag('posts')
  // Path-based invalidation for pages and RSS endpoints not yet wrapped
  // in unstable_cache.
  revalidatePath('/')
  revalidatePath('/api/rss')
  revalidatePath('/api/blog-feed.xml')
  if (normalizedTitle) revalidatePath(`/post/${normalizedTitle}`)
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-jwt-key'

// Helper to normalize title for URL
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Verify JWT token
function verifyToken(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.split(' ')[1]
  try {
    jwt.verify(token, JWT_SECRET)
    return true
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get('authorization')
  if (!verifyToken(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, title, description, content, category, image_url, enclosure } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const normalized_title = normalizeTitle(title)

    // If an ID is provided, update by ID directly (allows title changes during editing)
    if (id) {
      await db
        .update(posts)
        .set({
          title,
          normalized_title,
          description,
          content,
          category,
          image_url,
          enclosure
        })
        .where(eq(posts.id, id))

      invalidateBlogCaches(normalized_title)
      return NextResponse.json({ success: true, message: 'Post updated', id })
    }

    // Check if post already exists by normalized title
    const existingRows = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.normalized_title, normalized_title))
      .limit(1)

    if (existingRows.length > 0) {
      // Update existing post
      await db
        .update(posts)
        .set({
          title,
          description,
          content,
          category,
          image_url,
          enclosure
        })
        .where(eq(posts.id, existingRows[0].id))

      invalidateBlogCaches(normalized_title)
      return NextResponse.json({ success: true, message: 'Post updated', id: existingRows[0].id })
    } else {
      // Create new post
      const [newPost] = await db
        .insert(posts)
        .values({
          title,
          normalized_title,
          description,
          content,
          category,
          image_url,
          enclosure,
          pub_date: new Date()
        })
        .returning({ id: posts.id })

      // Create likes entry for new post
      await db.insert(likes).values({ post_id: newPost.id, likes_count: 0 })

      invalidateBlogCaches(normalized_title)
      return NextResponse.json({ success: true, message: 'Post created', id: newPost.id })
    }
  } catch (error) {
    console.error('Error in admin post API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
