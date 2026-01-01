import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-jwt-key'
const INKHOUSE_API_KEY = process.env.INKHOUSE_API_KEY

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

interface InkHousePayload {
  postId: number
  title: string
  content: string
  description: string
  category: string
  status: 'draft' | 'published'
  image_url?: string
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  const authHeader = request.headers.get('authorization')
  if (!verifyToken(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!INKHOUSE_API_KEY) {
    console.error('INKHOUSE_API_KEY not configured')
    return NextResponse.json(
      { error: 'InkHouse API not configured' },
      { status: 500 }
    )
  }

  try {
    const body: InkHousePayload = await request.json()
    const { postId, title, content, description, category, status, image_url } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const response = await fetch('https://inkhouse.haripriya.org/api/v1/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${INKHOUSE_API_KEY}`
      },
      body: JSON.stringify({
        title,
        content,
        description: description || '',
        category: category || 'General',
        status: status || 'draft',
        image_url: image_url || ''
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('InkHouse API error:', response.status, errorData)
      return NextResponse.json(
        {
          error: 'Failed to publish to InkHouse',
          details: errorData.message || `HTTP ${response.status}`
        },
        { status: response.status }
      )
    }

    // Update the post's inkhouse_published status in database
    if (postId) {
      const { error: updateError } = await supabase
        .from('posts')
        .update({ inkhouse_published: true })
        .eq('id', postId)

      if (updateError) {
        console.error('Failed to update inkhouse_published status:', updateError)
        // Don't fail the request - InkHouse publish succeeded
      }
    }

    const data = await response.json()
    return NextResponse.json({
      success: true,
      message: 'Published to InkHouse',
      inkHousePostId: data.id || data.postId
    })

  } catch (error) {
    console.error('Error publishing to InkHouse:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to publish to InkHouse', details: errorMessage },
      { status: 500 }
    )
  }
}
