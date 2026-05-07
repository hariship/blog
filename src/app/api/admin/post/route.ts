import { db } from '@/lib/db'
import { posts, likes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import jwt from 'jsonwebtoken'
import { sendNewsletterToSubscribers, type SendResult } from '@/lib/newsletter'

function invalidateBlogCaches(normalizedTitle?: string) {
  // Tag-based invalidation: clears every variant of /api/posts and
  // /api/categories tagged 'posts' in unstable_cache. In Next.js 16,
  // updateTag is Server-Action-only — Route Handlers must use revalidateTag.
  // The 'max' profile expires the entry immediately.
  revalidateTag('posts', 'max')
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
    const {
      id,
      title,
      description,
      content,
      category,
      image_url,
      enclosure,
      sendNewsletter,
      publishImmediately,
    } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const normalized_title = normalizeTitle(title)
    const shouldSendNewsletter = Boolean(sendNewsletter) && publishImmediately !== false

    // If an ID is provided, update by ID directly. Only regenerate
    // normalized_title when the title actually changed — otherwise we'd
    // break stable URLs every time the body or category is edited.
    if (id) {
      const [existing] = await db
        .select({ title: posts.title, normalized_title: posts.normalized_title })
        .from(posts)
        .where(eq(posts.id, id))
        .limit(1)

      const titleChanged = existing && existing.title.trim() !== title.trim()
      const slugToUse = titleChanged ? normalized_title : (existing?.normalized_title ?? normalized_title)

      await db
        .update(posts)
        .set({
          title,
          normalized_title: slugToUse,
          description,
          content,
          category,
          image_url,
          enclosure
        })
        .where(eq(posts.id, id))

      invalidateBlogCaches(slugToUse)
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

      // Newsletter — only on first publish (NEW post + sendNewsletter toggle on).
      // Failures don't fail the publish: the post is already saved.
      let newsletter: SendResult | null = null
      if (shouldSendNewsletter) {
        try {
          newsletter = await sendNewsletterToSubscribers({
            title,
            description,
            normalized_title,
            enclosure,
            category,
            content,
          })
        } catch (mailErr) {
          console.error('Newsletter send failed:', mailErr)
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Post created',
        id: newPost.id,
        ...(newsletter && { newsletter }),
      })
    }
  } catch (error) {
    console.error('Error in admin post API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
