import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { desc, ne } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'

// Cache the feed in-process. CDN cache-control still applies separately;
// this layer makes Vercel-region cold reads cheap. Tagged 'posts' so admin
// writes invalidate via revalidateTag.
const fetchFeedRows = unstable_cache(
  async () => {
    return db
      .select({
        title: posts.title,
        normalized_title: posts.normalized_title,
        description: posts.description,
        image_url: posts.image_url,
        pub_date: posts.pub_date,
        // NB: content intentionally NOT selected — RSS items use description
        // only. Pulling content was the dominant egress on this route.
        category: posts.category,
        enclosure: posts.enclosure,
      })
      .from(posts)
      .where(ne(posts.normalized_title, 'now'))
      .orderBy(desc(posts.pub_date))
      .limit(50)
  },
  ['blog-feed-xml'],
  { tags: ['posts'], revalidate: 604800 }
)

export async function GET() {
  const domain = (process.env.NEXT_PUBLIC_DOMAIN || 'https://blog.haripriya.org').trim()

  try {
    const rows = await fetchFeedRows()

    const rssItems = rows.map(post => {
      const pubDate = new Date(post.pub_date!).toUTCString()
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
