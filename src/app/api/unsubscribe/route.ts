import { db } from '@/lib/db'
import { subscribers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { verifyUnsubscribeToken } from '@/lib/newsletter'

const SITE_URL = (process.env.NEXT_PUBLIC_DOMAIN || 'https://blog.haripriya.org').replace(/\/$/, '')

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fbfaf7; color: #3a3835; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .panel { max-width: 480px; padding: 32px 24px; background: #fdfcf9; border: 1px solid #e6e2d6; border-radius: 24px 4px 4px 4px; box-shadow: 0 4px 8px rgba(74,72,65,0.12); margin: 24px; }
  .code { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #948f86; padding: 2px 6px; border: 1px solid #e6e2d6; border-radius: 2px; }
  h1 { font-size: 20px; margin: 16px 0 8px; }
  p { line-height: 1.6; color: #6c6863; margin: 0 0 16px; }
  a.cta { display: inline-block; padding: 8px 16px; background: transparent; color: #6c6863; text-decoration: none; border: 1px solid #d6d1c2; border-radius: 6px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 8px; }
  a.cta:hover { color: #3a3835; border-color: #6c6863; }
</style>
</head><body><div class="panel">${body}<p><a class="cta" href="${SITE_URL}">&larr; Return to home</a></p></div></body></html>`
}

// GET — handles the link in the email. Verifies the HMAC token, then either
// shows a confirmation form or unsubscribes immediately depending on whether
// the user came via a one-click MUA (List-Unsubscribe-Post: One-Click) or a
// regular browser GET. We unsubscribe on GET too (RFC 8058 explicitly allows
// both); confirmation is just a courtesy page.
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const email = url.searchParams.get('email')
  const token = url.searchParams.get('token')

  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return new NextResponse(
      htmlPage(
        'Invalid unsubscribe link',
        `<span class="code">ERR&middot;BAD&middot;TOKEN</span>
         <h1>Invalid unsubscribe link</h1>
         <p>The link you used is missing required information or has been tampered with. If you'd like to unsubscribe, reply to any newsletter email and I'll handle it manually.</p>`,
      ),
      { status: 400, headers: { 'Content-Type': 'text/html' } },
    )
  }

  try {
    await db
      .update(subscribers)
      .set({ status: 'unsubscribed', updated_at: new Date() })
      .where(eq(subscribers.email, email))

    return new NextResponse(
      htmlPage(
        'Unsubscribed',
        `<span class="code">SYS&middot;OK</span>
         <h1>You're unsubscribed</h1>
         <p>${email} won't receive any more newsletter entries. Sorry to see you go — the blog is still readable on the site, and the RSS feed remains open.</p>`,
      ),
      { status: 200, headers: { 'Content-Type': 'text/html' } },
    )
  } catch (error) {
    console.error('Unsubscribe failed:', error)
    return new NextResponse(
      htmlPage(
        'Something went wrong',
        `<span class="code">ERR&middot;DB</span>
         <h1>Could not unsubscribe</h1>
         <p>The server hit a problem updating your status. Please try again in a few minutes, or reply to any newsletter to be removed manually.</p>`,
      ),
      { status: 500, headers: { 'Content-Type': 'text/html' } },
    )
  }
}

// POST — for RFC 8058 one-click unsubscribe (Gmail/Outlook).
export async function POST(request: NextRequest) {
  return GET(request)
}
