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

function renderEmailHtml(post: NewsletterPost, recipientName: string | null, unsubscribeUrl: string): string {
  const postUrl = `${SITE_URL}/post/${post.normalized_title}`
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : 'Hi,'
  const description = post.description ? escapeHtml(post.description) : ''
  const image = post.enclosure
    ? `<img src="${escapeAttr(post.enclosure)}" alt="" style="max-width:100%;border-radius:8px;margin:16px 0;display:block;" />`
    : ''
  const category = post.category
    ? `<p style="font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#948f86;margin:0 0 8px 0;">${escapeHtml(post.category)}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(post.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#fbfaf7;font-family:'Iowan Old Style','Charter','Georgia','Cambria',serif;color:#3a3835;line-height:1.7;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <p style="margin:0 0 24px 0;font-size:14px;color:#6c6863;">${greeting}</p>
      <p style="margin:0 0 24px 0;font-size:15px;color:#6c6863;">A new entry on the blog.</p>
      ${category}
      <h1 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:24px;font-weight:600;color:#3a3835;margin:0 0 16px 0;letter-spacing:-0.01em;line-height:1.3;">${escapeHtml(post.title)}</h1>
      ${image}
      ${description ? `<p style="margin:0 0 24px 0;font-size:16px;color:#3a3835;">${description}</p>` : ''}
      <p style="margin:32px 0;">
        <a href="${escapeAttr(postUrl)}"
           style="display:inline-block;padding:10px 18px;background:#5b6b75;color:#fdfcf9;text-decoration:none;border-radius:6px;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">
          Read full entry &rarr;
        </a>
      </p>
      <hr style="border:0;border-top:1px solid #e6e2d6;margin:32px 0 16px 0;" />
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
  return [
    greeting,
    '',
    'A new entry on the blog:',
    '',
    post.title,
    post.description ? `\n${post.description}` : '',
    '',
    `Read it: ${postUrl}`,
    '',
    '---',
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
