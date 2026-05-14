import { db } from '@/lib/db'
import { personalLogs } from '@/lib/db/schema'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-jwt-key'

function verifyToken(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  const token = authHeader.split(' ')[1]
  try {
    jwt.verify(token, JWT_SECRET)
    return true
  } catch {
    return false
  }
}

function invalidate() {
  revalidateTag('personal-logs', 'max')
  revalidatePath('/now')
}

// POST /api/admin/personal-log — create a new entry. Body: { body: string }
export async function POST(request: NextRequest) {
  if (!verifyToken(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { body } = await request.json()
    if (!body || typeof body !== 'string' || !body.trim()) {
      return NextResponse.json({ error: 'Body is required' }, { status: 400 })
    }

    const [row] = await db
      .insert(personalLogs)
      .values({ body: body.trim() })
      .returning({ id: personalLogs.id, created_at: personalLogs.created_at })

    invalidate()
    return NextResponse.json({ success: true, id: row.id, created_at: row.created_at })
  } catch (error) {
    console.error('Error creating personal log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
