import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const { email, name, categories, frequency } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if subscriber exists
    const { data: existingSubscriber } = await supabase
      .from('subscribers')
      .select('id, status')
      .eq('email', email)
      .single()

    if (existingSubscriber) {
      // Update existing subscriber
      const { error: updateError } = await supabase
        .from('subscribers')
        .update({
          name,
          categories,
          frequency,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSubscriber.id)

      if (updateError) {
        console.error('Error updating subscriber:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Subscription updated' })
    } else {
      // Create new subscriber
      const { error: insertError } = await supabase
        .from('subscribers')
        .insert({
          email,
          name,
          categories,
          frequency,
          status: 'active'
        })

      if (insertError) {
        console.error('Error creating subscriber:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Subscribed successfully' })
    }
  } catch (error) {
    console.error('Error in subscribe API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
