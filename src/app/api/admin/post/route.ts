import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

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
  const supabase = createServerClient()

  // Verify authentication
  const authHeader = request.headers.get('authorization')
  if (!verifyToken(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, description, content, category, image_url, enclosure } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const normalized_title = normalizeTitle(title)

    // Check if post already exists
    const { data: existingPost } = await supabase
      .from('posts')
      .select('id')
      .eq('normalized_title', normalized_title)
      .single()

    if (existingPost) {
      // Update existing post
      const { error: updateError } = await supabase
        .from('posts')
        .update({
          title,
          description,
          content,
          category,
          image_url,
          enclosure
        })
        .eq('id', existingPost.id)

      if (updateError) {
        console.error('Error updating post:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Post updated', id: existingPost.id })
    } else {
      // Create new post
      const { data: newPost, error: insertError } = await supabase
        .from('posts')
        .insert({
          title,
          normalized_title,
          description,
          content,
          category,
          image_url,
          enclosure,
          pub_date: new Date().toISOString()
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Error creating post:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      // Create likes entry for new post
      await supabase.from('likes').insert({ post_id: newPost.id, likes_count: 0 })

      return NextResponse.json({ success: true, message: 'Post created', id: newPost.id })
    }
  } catch (error) {
    console.error('Error in admin post API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
