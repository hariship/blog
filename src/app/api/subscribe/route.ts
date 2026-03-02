import { db } from '@/lib/db'
import { subscribers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, name, categories, frequency } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if subscriber exists
    const existingRows = await db
      .select({ id: subscribers.id, status: subscribers.status })
      .from(subscribers)
      .where(eq(subscribers.email, email))
      .limit(1)

    if (existingRows.length > 0) {
      // Update existing subscriber
      await db
        .update(subscribers)
        .set({
          name,
          categories,
          frequency,
          status: 'active',
          updated_at: new Date()
        })
        .where(eq(subscribers.id, existingRows[0].id))

      return NextResponse.json({ success: true, message: 'Subscription updated' })
    } else {
      // Create new subscriber
      await db
        .insert(subscribers)
        .values({
          email,
          name,
          categories,
          frequency,
          status: 'active'
        })

      return NextResponse.json({ success: true, message: 'Subscribed successfully' })
    }
  } catch (error) {
    console.error('Error in subscribe API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
