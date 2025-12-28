import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ title: string }> }
) {
  const supabase = createServerClient()
  const { title } = await params

  try {
    const { data: post, error } = await supabase
      .from('posts')
      .select('*, likes(likes_count)')
      .eq('normalized_title', title)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }
      console.error('Error fetching post:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to include likesCount at top level
    const transformedPost = {
      ...post,
      likesCount: post.likes?.[0]?.likes_count || 0,
      likes: undefined
    }

    return NextResponse.json(transformedPost)
  } catch (error) {
    console.error('Error in post API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
