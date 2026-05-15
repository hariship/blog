import { NextRequest, NextResponse } from 'next/server'

/**
 * Multi-domain routing for the Vercel project.
 *
 *   haripriya.org / www.haripriya.org
 *     /            →  rewrite to /portfolio (URL bar stays /)
 *     /portfolio   →  301 redirect to /     (canonical, hides internal path)
 *
 *   blog.haripriya.org
 *     /            →  unchanged (existing blog)
 *     /portfolio   →  404      (portfolio isn't a blog route)
 *
 *   localhost / *.vercel.app
 *     all paths    →  unchanged (dev + preview can hit /portfolio for QA)
 *
 * Every other path is shared between both domains.
 */
export function middleware(request: NextRequest) {
  const host = (request.headers.get('host') || '').toLowerCase()
  const { pathname } = request.nextUrl

  const isHaripriyaRoot = host === 'haripriya.org' || host === 'www.haripriya.org'
  const isBlogProd = host === 'blog.haripriya.org'
  const isPortfolioPath = pathname === '/portfolio' || pathname.startsWith('/portfolio/')

  // On haripriya.org: hide the /portfolio path from public URLs.
  if (isHaripriyaRoot && isPortfolioPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url, 301)
  }

  // On haripriya.org: rewrite the root to the portfolio page internally.
  if (isHaripriyaRoot && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/portfolio'
    return NextResponse.rewrite(url)
  }

  // On the blog production domain: /portfolio doesn't exist.
  if (isBlogProd && isPortfolioPath) {
    return new NextResponse(null, { status: 404 })
  }

  return NextResponse.next()
}

export const config = {
  // Match all paths except static assets and Next internals.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo192.png|logo512.png|.*\\.(?:png|jpg|jpeg|svg|webp|ico|json|xml|txt|woff|woff2)).*)'],
}
