import { db } from '@/lib/db'
import { personalLogs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
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

// PATCH /api/admin/personal-log/[id] — edit body
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyToken(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  try {
    const { body } = await request.json()
    if (!body || typeof body !== 'string' || !body.trim()) {
      return NextResponse.json({ error: 'Body is required' }, { status: 400 })
    }

    await db
      .update(personalLogs)
      .set({ body: body.trim(), updated_at: new Date() })
      .where(eq(personalLogs.id, id))

    invalidate()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating personal log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/personal-log/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyToken(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  try {
    await db.delete(personalLogs).where(eq(personalLogs.id, id))
    invalidate()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting personal log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
