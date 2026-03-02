import { db } from '@/lib/db'
import { adminUsers } from '@/lib/db/schema'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-jwt-key'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    // Get admin user
    const rows = await db
      .select({ id: adminUsers.id, password_hash: adminUsers.password_hash })
      .from(adminUsers)
      .limit(1)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    const admin = rows[0]

    // Compare password
    const isValid = await bcrypt.compare(password, admin.password_hash)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    // Generate JWT token — no expiry, cleared only on explicit logout
    const token = jwt.sign(
      { adminId: admin.id },
      JWT_SECRET
    )

    return NextResponse.json({ success: true, token })
  } catch (error) {
    console.error('Error in admin auth API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
