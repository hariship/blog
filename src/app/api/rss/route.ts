import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerClient()

  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('title, normalized_title, description, image_url, pub_date, category, likes(likes_count)')
      .order('pub_date', { ascending: false })

    if (error) {
      console.error('Error fetching RSS feed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform posts for RSS feed / likes context
    const transformedPosts = posts?.map(post => ({
      title: post.title,
      normalized_title: post.normalized_title,
      description: post.description,
      image_url: post.image_url,
      pubDate: post.pub_date,
      category: post.category,
      likesCount: post.likes?.[0]?.likes_count || 0,
      isLiked: false // Client will merge with localStorage
    }))

    return NextResponse.json(transformedPosts)
  } catch (error) {
    console.error('Error in RSS API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
