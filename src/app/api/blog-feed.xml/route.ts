import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerClient()
  const domain = process.env.NEXT_PUBLIC_DOMAIN || 'https://blog.haripriya.org'

  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('title, normalized_title, description, image_url, pub_date, content, category, enclosure')
      .order('pub_date', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching posts for RSS:', error)
      return new NextResponse('Error generating RSS feed', { status: 500 })
    }

    const rssItems = posts?.map(post => {
      const pubDate = new Date(post.pub_date).toUTCString()
      const link = `${domain}/post/${post.normalized_title}`

      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${post.description || ''}]]></description>
      <pubDate>${pubDate}</pubDate>
      ${post.category ? `<category>${post.category}</category>` : ''}
      ${post.enclosure ? `<enclosure url="${post.enclosure}" type="image/jpeg" />` : ''}
    </item>`
    }).join('')

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Haripriya's Blog</title>
    <link>${domain}</link>
    <description>Personal blog by Hari - thoughts, projects, and life updates</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${domain}/api/blog-feed.xml" rel="self" type="application/rss+xml" />
    ${rssItems}
  </channel>
</rss>`

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
      }
    })
  } catch (error) {
    console.error('Error in RSS feed API:', error)
    return new NextResponse('Error generating RSS feed', { status: 500 })
  }
}
