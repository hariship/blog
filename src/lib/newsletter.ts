import crypto from 'crypto'
import { Resend } from 'resend'
import { db } from '@/lib/db'
import { subscribers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

interface NewsletterPost {
  title: string
  description?: string | null
  normalized_title: string
  enclosure?: string | null
  category?: string | null
  /** Full post HTML body. When provided, the email contains the entry inline
   * instead of a CTA to read it on the blog. */
  content?: string | null
}

const SITE_URL = (process.env.NEXT_PUBLIC_DOMAIN || 'https://blog.haripriya.org').replace(/\/$/, '')

// HMAC-signed unsubscribe token. Subscriber proves their identity simply by
// knowing the email + a server-side secret-derived token. No DB writes
// needed at link generation time.
function signUnsubscribeToken(email: string): string {
  const secret = process.env.JWT_SECRET || 'fallback-newsletter-secret'
  return crypto
    .createHmac('sha256', secret)
    .update(`unsubscribe:${email.toLowerCase()}`)
    .digest('base64url')
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = signUnsubscribeToken(email)
  // Constant-time compare to dodge timing leaks (paranoid but cheap).
  if (expected.length !== token.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
}

function buildUnsubscribeUrl(email: string): string {
  const token = signUnsubscribeToken(email)
  const params = new URLSearchParams({ email, token })
  return `${SITE_URL}/api/unsubscribe?${params.toString()}`
}

/** Expand [TOGGLE]/[END TOGGLE] markers into a heading + body. <details> tags
 *  don't render reliably across email clients, so we just unfold them. */
function expandToggleBlocks(html: string): string {
  // Same WS-aware patterns as PostClient — Quill emits &nbsp; literally.
  const WS = '(?:\\s|&nbsp;|&#160;|&#xa0;)'
  const SENTINEL = '__BLOG_END_TOGGLE__'

  let out = html.replace(
    new RegExp(`\\[?${WS}*END${WS}+TOGGLE${WS}*\\]?`, 'gi'),
    SENTINEL,
  )
  out = out.replace(
    new RegExp(`<(?:strong|b|em|i)[^>]*>\\s*${SENTINEL}\\s*<\\/(?:strong|b|em|i)>`, 'gi'),
    SENTINEL,
  )
  out = out.replace(
    new RegExp(`<p[^>]*>(?:\\s|<br[^>]*>|&nbsp;)*${SENTINEL}(?:\\s|<br[^>]*>|&nbsp;)*<\\/p>`, 'gi'),
    SENTINEL,
  )

  // Convert <p><strong>[TOGGLE] Title</strong></p> ... SENTINEL into
  // a small heading + the body unfolded.
  out = out.replace(
    new RegExp(
      `<p[^>]*><strong[^>]*>\\[TOGGLE\\]${WS}*([^<]+)<\\/strong><\\/p>([\\s\\S]*?)(?:${SENTINEL}|(?=<p[^>]*><strong[^>]*>\\[TOGGLE\\])|$)`,
      'gi',
    ),
    (_match, title: string, body: string) => {
      const cleanTitle = title.replace(/&nbsp;|&#160;|&#xa0;/g, ' ').trim()
      return `<h3 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:17px;font-weight:600;color:#3a3835;margin:24px 0 8px 0;border-left:3px solid #d6d1c2;padding-left:12px;">${escapeHtml(cleanTitle)}</h3>${(body || '').trim()}`
    },
  )

  return out.split(SENTINEL).join('')
}

/** Make src="/uploads/foo.jpg" absolute and href="/some/path" absolute too,
 *  so links/images resolve when opened from an email client. */
function absolutizeUrls(html: string): string {
  return html
    .replace(/(src|href)=("|')(\/[^"']*)\2/g, (_m, attr, q, path) => `${attr}=${q}${SITE_URL}${path}${q}`)
}

/** For each <img>, wrap it in an <a download> linking to a Cloudinary
 *  fl_attachment URL (or the same URL elsewhere) so click-to-download works
 *  in email clients. Display stays inline because src= is unchanged. */
function wrapImagesWithDownload(html: string): string {
  return html.replace(/<img\b([^>]*?)src=("|')([^"']+)\2([^>]*)>/gi, (_match, before, q, src, after) => {
    let downloadUrl = src
    // Cloudinary: insert fl_attachment after /image/upload/ so the response
    // gets Content-Disposition: attachment when fetched directly.
    if (src.includes('res.cloudinary.com') && !src.includes('fl_attachment')) {
      downloadUrl = src.replace(/(\/image\/upload\/)/i, '$1fl_attachment/')
    }
    return `<a href="${downloadUrl.replace(/"/g, '&quot;')}" download style="display:inline-block;text-decoration:none;"><img${before}src=${q}${src}${q}${after}></a>`
  })
}

/** Inline styles the email client won't get from external CSS. We use a
 *  <style> block AND inline critical styles for max compatibility. */
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

function renderEmailHtml(post: NewsletterPost, recipientName: string | null, unsubscribeUrl: string): string {
  const postUrl = `${SITE_URL}/post/${post.normalized_title}`
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : 'Hi,'
  const description = post.description ? escapeHtml(post.description) : ''
  const category = post.category
    ? `<p style="font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#948f86;margin:0 0 8px 0;">${escapeHtml(post.category)}</p>`
    : ''

  // No cover image — `post.enclosure` is intentionally skipped because it's
  // usually the same as the first image inside the body. Inline images from
  // post.content are kept.
  const bodyHtml = post.content
    ? wrapImagesWithDownload(absolutizeUrls(expandToggleBlocks(post.content)))
    : ''

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(post.title)}</title>
    <style>${POST_BODY_STYLES}</style>
  </head>
  <body style="margin:0;padding:0;background:#fbfaf7;font-family:'Iowan Old Style','Charter','Georgia','Cambria',serif;color:#3a3835;line-height:1.7;">
    <div style="max-width:600px;margin:0 auto;padding:32px 24px;">

      <!-- Greeting + intro live OUTSIDE the post card so the post itself reads as a quoted entry. -->
      <p style="margin:0 0 12px 0;font-size:15px;color:#3a3835;">${greeting}</p>
      <p style="margin:0 0 32px 0;font-size:15px;color:#6c6863;">From the desk.</p>

      <!-- The post itself, on a card-shaped panel so it visually belongs together. -->
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
        You're receiving this because you subscribed at
        <a href="${escapeAttr(SITE_URL)}" style="color:#6b7280;">blog.haripriya.org</a>.
        <a href="${escapeAttr(unsubscribeUrl)}" style="color:#6b7280;">Unsubscribe</a>.
      </p>
    </div>
  </body>
</html>`
}

function renderEmailText(post: NewsletterPost, recipientName: string | null, unsubscribeUrl: string): string {
  const postUrl = `${SITE_URL}/post/${post.normalized_title}`
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,'
  // Strip tags + collapse whitespace + decode the few entities Quill emits.
  const plainBody = post.content
    ? post.content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : ''
  return [
    greeting,
    '',
    post.title,
    post.description ? `\n${post.description}` : '',
    plainBody ? `\n${plainBody}` : '',
    '',
    '---',
    `Reply on the blog: ${postUrl}#discussion`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].filter(Boolean).join('\n')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, '&quot;')
}

export interface SendResult {
  attempted: number
  sent: number
  failed: number
  errors: Array<{ email: string; error: string }>
}

/** Send the post as a newsletter to every active subscriber. Returns a per-recipient result. */
export async function sendNewsletterToSubscribers(post: NewsletterPost): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) {
    throw new Error('Newsletter not configured: RESEND_API_KEY and EMAIL_FROM are required')
  }

  const rows = await db
    .select({ email: subscribers.email, name: subscribers.name, status: subscribers.status })
    .from(subscribers)
    .where(eq(subscribers.status, 'active'))

  const resend = new Resend(apiKey)
  const result: SendResult = { attempted: rows.length, sent: 0, failed: 0, errors: [] }

  // Fire one request per subscriber so a single bad email doesn't taint the
  // batch. Resend's free tier rate limit is generous (~10/sec); for 6
  // subscribers this is fine. If the list grows, switch to batch send.
  for (const sub of rows) {
    try {
      const unsubscribeUrl = buildUnsubscribeUrl(sub.email)
      await resend.emails.send({
        from,
        to: sub.email,
        subject: post.title,
        html: renderEmailHtml(post, sub.name, unsubscribeUrl),
        text: renderEmailText(post, sub.name, unsubscribeUrl),
        headers: {
          // RFC 8058 one-click unsubscribe — Gmail/Outlook show the link in their UI
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })
      result.sent += 1
    } catch (err) {
      result.failed += 1
      result.errors.push({
        email: sub.email,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return result
}
