// One-off test: send a single newsletter preview to mailtoharipriyas@gmail.com
// using a REAL post from the DB (most recent) so the layout reflects what
// subscribers will actually receive — including the full body content.
//
// Run with:  node --env-file=.env.local scripts/test-newsletter.mjs

import crypto from 'node:crypto'
import postgres from 'postgres'
import { Resend } from 'resend'

const TEST_RECIPIENT = 'mailtoharipriyas@gmail.com'
const TEST_NAME = 'Hari'

const apiKey = process.env.RESEND_API_KEY
const from = process.env.EMAIL_FROM
const dbUrl = process.env.DATABASE_URL
const secret = process.env.JWT_SECRET || 'fallback-newsletter-secret'
const SITE_URL = (process.env.NEXT_PUBLIC_DOMAIN || 'https://blog.haripriya.org').replace(/\/$/, '')

if (!apiKey || !from || !dbUrl) {
  console.error('Missing RESEND_API_KEY, EMAIL_FROM, or DATABASE_URL in env')
  process.exit(1)
}

// Fetch the most recent post (excluding /now)
const sql = postgres(dbUrl, { prepare: false, max: 1 })
const [post] = await sql`
  SELECT title, description, normalized_title, enclosure, category, content
  FROM posts
  WHERE normalized_title <> 'now'
  ORDER BY pub_date DESC
  LIMIT 1
`
if (!post) {
  console.error('No posts in DB')
  process.exit(1)
}
await sql.end()

console.log(`Test post: "${post.title}" (slug: ${post.normalized_title})`)

// --- Inlined helpers from src/lib/newsletter.ts ---
const WS = '(?:\\s|&nbsp;|&#160;|&#xa0;)'
const SENTINEL = '__BLOG_END_TOGGLE__'

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
function escapeAttr(value) {
  return String(value).replace(/"/g, '&quot;')
}
function signUnsubscribeToken(email) {
  return crypto.createHmac('sha256', secret).update(`unsubscribe:${email.toLowerCase()}`).digest('base64url')
}
function buildUnsubscribeUrl(email) {
  const token = signUnsubscribeToken(email)
  return `${SITE_URL}/api/unsubscribe?${new URLSearchParams({ email, token }).toString()}`
}
function expandToggleBlocks(html) {
  let out = html.replace(new RegExp(`\\[?${WS}*END${WS}+TOGGLE${WS}*\\]?`, 'gi'), SENTINEL)
  out = out.replace(new RegExp(`<(?:strong|b|em|i)[^>]*>\\s*${SENTINEL}\\s*<\\/(?:strong|b|em|i)>`, 'gi'), SENTINEL)
  out = out.replace(new RegExp(`<p[^>]*>(?:\\s|<br[^>]*>|&nbsp;)*${SENTINEL}(?:\\s|<br[^>]*>|&nbsp;)*<\\/p>`, 'gi'), SENTINEL)
  out = out.replace(
    new RegExp(`<p[^>]*><strong[^>]*>\\[TOGGLE\\]${WS}*([^<]+)<\\/strong><\\/p>([\\s\\S]*?)(?:${SENTINEL}|(?=<p[^>]*><strong[^>]*>\\[TOGGLE\\])|$)`, 'gi'),
    (_m, title, body) => {
      const cleanTitle = title.replace(/&nbsp;|&#160;|&#xa0;/g, ' ').trim()
      return `<h3 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:17px;font-weight:600;color:#3a3835;margin:24px 0 8px 0;border-left:3px solid #d6d1c2;padding-left:12px;">${escapeHtml(cleanTitle)}</h3>${(body || '').trim()}`
    },
  )
  return out.split(SENTINEL).join('')
}
function absolutizeUrls(html) {
  return html.replace(/(src|href)=("|')(\/[^"']*)\2/g, (_m, attr, q, path) => `${attr}=${q}${SITE_URL}${path}${q}`)
}

function wrapImagesWithDownload(html) {
  return html.replace(/<img\b([^>]*?)src=("|')([^"']+)\2([^>]*)>/gi, (_m, before, q, src, after) => {
    let downloadUrl = src
    if (src.includes('res.cloudinary.com') && !src.includes('fl_attachment')) {
      downloadUrl = src.replace(/(\/image\/upload\/)/i, '$1fl_attachment/')
    }
    return `<a href="${downloadUrl.replace(/"/g, '&quot;')}" download style="display:inline-block;text-decoration:none;"><img${before}src=${q}${src}${q}${after}></a>`
  })
}

const POST_BODY_STYLES = `
  .blog-body { font-family: 'Iowan Old Style', 'Charter', 'Georgia', 'Cambria', serif; color: #3a3835; font-size: 16px; line-height: 1.7; }
  .blog-body p { margin: 0 0 16px 0; }
  .blog-body h2 { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 22px; font-weight: 600; color: #3a3835; margin: 32px 0 12px 0; line-height: 1.3; }
  .blog-body h3 { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 18px; font-weight: 600; color: #3a3835; margin: 24px 0 8px 0; line-height: 1.3; }
  .blog-body a { color: #5b6b75; text-decoration: underline; }
  .blog-body strong { font-weight: 600; }
  .blog-body em { font-style: italic; }
  .blog-body ul, .blog-body ol { margin: 0 0 16px 0; padding-left: 24px; }
  .blog-body li { margin-bottom: 6px; }
  .blog-body blockquote { border-left: 4px solid #8b6f47; padding: 4px 16px; margin: 16px 0; font-style: italic; color: #6c6863; background-color: #f3f0e8; border-radius: 0 4px 4px 0; }
  .blog-body img { max-width: 100%; height: auto; display: block; margin: 16px 0; border-radius: 8px; }
  .blog-body hr { border: 0; border-top: 1px solid #d6d1c2; margin: 24px 0; }
  .blog-body pre { background: #f3f0e8; padding: 12px; border-radius: 6px; overflow-x: auto; font-family: 'IBM Plex Mono', monospace; font-size: 13px; }
  .blog-body code { font-family: 'IBM Plex Mono', monospace; font-size: 14px; background: #f3f0e8; padding: 1px 4px; border-radius: 3px; }
`

function renderHtml(post, name, unsubUrl) {
  const postUrl = `${SITE_URL}/post/${post.normalized_title}`
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,'
  const description = post.description ? escapeHtml(post.description) : ''
  // Cover image (post.enclosure) intentionally omitted — it's usually the
  // same as the first image inside the body. Inline images from content stay.
  const category = post.category
    ? `<p style="font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#948f86;margin:0 0 8px 0;">${escapeHtml(post.category)}</p>`
    : ''
  const bodyHtml = post.content ? wrapImagesWithDownload(absolutizeUrls(expandToggleBlocks(post.content))) : ''
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(post.title)}</title><style>${POST_BODY_STYLES}</style></head>
<body style="margin:0;padding:0;background:#fbfaf7;font-family:'Iowan Old Style','Charter','Georgia','Cambria',serif;color:#3a3835;line-height:1.7;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <p style="margin:0 0 12px 0;font-size:15px;color:#3a3835;">${greeting}</p>
    <p style="margin:0 0 32px 0;font-size:15px;color:#6c6863;">From the desk.</p>
    <div style="background:#fdfcf9;border:1px solid #e6e2d6;border-radius:24px 4px 4px 4px;padding:28px 24px;">
      ${category}
      <h1 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:26px;font-weight:600;color:#3a3835;margin:0 0 16px 0;letter-spacing:-0.01em;line-height:1.3;">${escapeHtml(post.title)}</h1>
      ${description ? `<p style="margin:0 0 24px 0;font-size:17px;color:#6c6863;font-style:italic;">${description}</p>` : ''}
      ${bodyHtml ? `<div class="blog-body" style="font-family:'Iowan Old Style','Charter','Georgia','Cambria',serif;color:#3a3835;font-size:16px;line-height:1.7;">${bodyHtml}</div>` : ''}
    </div>
    <hr style="border:0;border-top:1px solid #e6e2d6;margin:32px 0 16px 0;" />
    <p style="margin:0 0 8px 0;font-size:13px;color:#6c6863;font-family:-apple-system,sans-serif;">
      Want to reply? <a href="${escapeAttr(postUrl)}#discussion" style="color:#5b6b75;">Comment on the blog &rarr;</a>
    </p>
    <p style="margin:0;font-size:12px;color:#948f86;font-family:-apple-system,sans-serif;">
      You're receiving this because you subscribed at <a href="${escapeAttr(SITE_URL)}" style="color:#6b7280;">blog.haripriya.org</a>.
      <a href="${escapeAttr(unsubUrl)}" style="color:#6b7280;">Unsubscribe</a>.
    </p>
  </div>
</body></html>`
}

const unsubUrl = buildUnsubscribeUrl(TEST_RECIPIENT)
const resend = new Resend(apiKey)

console.log(`Sending TEST newsletter to ${TEST_RECIPIENT} from ${from}…`)
try {
  const { data, error } = await resend.emails.send({
    from,
    to: TEST_RECIPIENT,
    subject: `[TEST] ${post.title}`,
    html: renderHtml(post, TEST_NAME, unsubUrl),
    headers: {
      'List-Unsubscribe': `<${unsubUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })
  if (error) {
    console.error('Resend error:', error)
    process.exit(1)
  }
  console.log('Sent. Resend message id:', data?.id)
} catch (err) {
  console.error('Send threw:', err)
  process.exit(1)
}
