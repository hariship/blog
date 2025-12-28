import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// Cache for 60 seconds
export const revalidate = 60

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)

  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const category = searchParams.get('category')
  const search = searchParams.get('search')

  const offset = (page - 1) * limit

  try {
    let query = supabase
      .from('posts')
      .select('*, likes(likes_count)', { count: 'exact' })
      .order('pub_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: posts, error, count } = await query

    if (error) {
      console.error('Error fetching posts:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform posts to include likesCount at top level
    const transformedPosts = posts?.map(post => ({
      ...post,
      likesCount: post.likes?.[0]?.likes_count || 0,
      likes: undefined
    }))

    const response = NextResponse.json({
      posts: transformedPosts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil((count || 0) / limit),
        totalItems: count || 0,
        itemsPerPage: limit
      }
    })

    // Cache for 60 seconds, stale-while-revalidate for 5 minutes
    response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Error in posts API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
