import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const { postTitle, increment } = await request.json()

    if (!postTitle) {
      return NextResponse.json({ error: 'Post title is required' }, { status: 400 })
    }

    // Get the post ID from normalized title
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('normalized_title', postTitle)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Get current likes count
    const { data: likesData, error: likesError } = await supabase
      .from('likes')
      .select('likes_count')
      .eq('post_id', post.id)
      .single()

    if (likesError && likesError.code !== 'PGRST116') {
      console.error('Error fetching likes:', likesError)
      return NextResponse.json({ error: likesError.message }, { status: 500 })
    }

    const currentCount = likesData?.likes_count || 0
    const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1)

    // Update or insert likes
    if (likesData) {
      const { error: updateError } = await supabase
        .from('likes')
        .update({ likes_count: newCount })
        .eq('post_id', post.id)

      if (updateError) {
        console.error('Error updating likes:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    } else {
      const { error: insertError } = await supabase
        .from('likes')
        .insert({ post_id: post.id, likes_count: newCount })

      if (insertError) {
        console.error('Error inserting likes:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, likesCount: newCount })
  } catch (error) {
    console.error('Error in update-likes API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
