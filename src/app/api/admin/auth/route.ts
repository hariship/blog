import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-jwt-key'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    // Get admin user
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, password_hash')
      .limit(1)
      .single()

    if (error || !admin) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

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
