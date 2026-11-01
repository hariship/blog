'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/layout'
import { ThemeToggle, SoundToggle } from '@/components/common'
import { RSSFeedButton, Subscribe, CoffeeLink } from '@/components/widgets'
import { Shuffle, HelpCircle } from 'lucide-react'
import ViewSwitcher, { ViewMode } from '@/components/ViewSwitcher'
import AccessingOverlay from '@/components/AccessingOverlay'
import AckToast from '@/components/AckToast'
import Decoded from '@/components/Decoded'
import { useLikes } from '@/contexts/LikesContext'
import { useSounds } from '@/contexts/SoundContext'
import { useAdmin } from '@/contexts/AdminContext'
import { PostWithLikes } from '@/types'
import './home.css'

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[date.getMonth()]} ${date.getDate()}`
  } catch {
    return dateString
  }
}

// Default export wraps the content in Suspense — required because
// HomePageContent uses useSearchParams(), and Next 16 refuses to prerender
// a page that calls it without a boundary above. Fallback is null because
// the AccessingOverlay loader handles soft-nav visuals already.
export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  )
}

function HomePageContent() {
  const router = useRouter()
  const urlParams = useSearchParams()

  const [posts, setPosts] = useState<PostWithLikes[]>([])
  const [categories, setCategories] = useState<string[]>([])
  // Initialise from URL so router.back() from a post restores the filter state.
  const [selectedCategory, setSelectedCategory] = useState<string>(() => urlParams.get('category') || '')
  const [searchQuery, setSearchQuery] = useState<string>(() => urlParams.get('search') || '')
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const p = parseInt(urlParams.get('page') || '1', 10)
    return Number.isFinite(p) && p > 0 ? p : 1
  })
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalPosts, setTotalPosts] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const postsPerPage = 10

  const { likesData, updateLikesData } = useLikes()
  const { playButtonSound, playKeypadBeep } = useSounds()
  const { isAdmin, adminToken, mounted: adminMounted } = useAdmin()
  const [publishingPostId, setPublishingPostId] = useState<number | null>(null)
  const [inkHouseError, setInkHouseError] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false)
  const [accessingMessage, setAccessingMessage] = useState<string | null>(null)
  // Computer-voice ack toast for read-toggles from the feed.
  const [ack, setAck] = useState<string | null>(null)
  // Boot overlay — only shows if the initial /api/posts fetch is actually
  // slow (>300ms). Once posts arrive it hides immediately. Gated by
  // sessionStorage so even slow loads only flash this on the first visit
  // per session; subsequent navigations rely on the lighter
  // accessingMessage path. Fast loads skip the overlay entirely.
  const [booting, setBooting] = useState<boolean>(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    let alreadyBooted = false
    try { alreadyBooted = window.sessionStorage.getItem('booted') === '1' } catch { /* private mode */ }
    if (alreadyBooted) return
    const showTimer = setTimeout(() => {
      // Only flash the overlay if we're still loading 300ms in.
      if (loading) {
        setBooting(true)
        try { window.sessionStorage.setItem('booted', '1') } catch { /* ignore */ }
      } else {
        // Fast load — count this as "booted" so we don't try again later.
        try { window.sessionStorage.setItem('booted', '1') } catch { /* ignore */ }
      }
    }, 300)
    return () => clearTimeout(showTimer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Hide the boot overlay as soon as posts finish loading.
  useEffect(() => {
    if (!loading && booting) setBooting(false)
  }, [loading, booting])

  // Mirror filters into the URL with router.replace so the browser history
  // entry for the home page captures the filter state. When the user clicks
  // a post then hits Back, the home page mounts with the same params and
  // the filter is restored.
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedCategory) params.set('category', selectedCategory)
    if (searchQuery) params.set('search', searchQuery)
    if (currentPage > 1) params.set('page', String(currentPage))
    const qs = params.toString()
    const target = qs ? `/?${qs}` : '/'
    const current = window.location.pathname + window.location.search
    if (current !== target) {
      router.replace(target, { scroll: false })
    }
  }, [selectedCategory, searchQuery, currentPage, router])

  // Centralised hard-nav helper. Shows the loader, then navigates. The overlay
  // stays visible until the browser unmounts the page on the new request.
  const accessAndGo = (url: string, message: string) => {
    setAccessingMessage(message)
    // tiny tick so React commits the overlay before we hand off to the browser
    setTimeout(() => { window.location.href = url }, 16)
  }

  // Keyboard shortcuts on home:
  //   '/'  → focus search
  //   'r'  → random log
  //   'n'  → newest log (most recent by pub_date)
  //   '?'  → open shortcuts overlay
  //   Esc  → close overlay
  // Skipped when the user is typing in an input/textarea/select/contentEditable.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Esc always closes the overlay (even from inside an input)
      if (e.key === 'Escape' && showShortcuts) {
        setShowShortcuts(false)
        return
      }
      const triggers = ['/', 'r', 'R', 'n', 'N', 's', 'S', '?']
      if (!triggers.includes(e.key)) return
      // Don't trigger on modified keypresses (Cmd-R / Ctrl-R = browser reload)
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (!target) return
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (target.isContentEditable) return

      if (e.key === '/') {
        e.preventDefault()
        playKeypadBeep()
        searchInputRef.current?.focus()
      } else if (e.key === '?') {
        e.preventDefault()
        playButtonSound()
        setShowShortcuts((open) => !open)
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        playButtonSound()
        setShowShortcuts(false)
        accessAndGo('/api/latest-post', 'ACCESSING NEWEST LOG')
      } else if (e.key === 's' || e.key === 'S') {
        // 's' or 'S' — open the Subscribe modal by clicking its button.
        // Subscribe is a self-contained component; clicking its DOM trigger is
        // the simplest hand-off without lifting state.
        e.preventDefault()
        playButtonSound()
        setShowShortcuts(false)
        const subscribeBtn = document.querySelector<HTMLButtonElement>('.subscribe-icon-btn')
        subscribeBtn?.click()
      } else {
        // 'r' or 'R' — navigate to a random log via the redirect endpoint
        e.preventDefault()
        playButtonSound()
        setShowShortcuts(false)
        accessAndGo('/api/random-post', 'ACCESSING RANDOM LOG')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showShortcuts])

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        const data = await response.json()
        // API returns array directly, not { categories: [...] }
        setCategories(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }
    fetchCategories()
  }, [])

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: postsPerPage.toString(),
        })
        if (selectedCategory) params.append('category', selectedCategory)
        if (searchQuery) params.append('search', searchQuery)

        const response = await fetch(`/api/posts?${params}`)
        const data = await response.json()

        setPosts(data.posts || [])
        const total = data.pagination?.totalItems || data.total || 0
        setTotalPosts(total)
        setTotalPages(data.pagination?.totalPages || Math.ceil(total / postsPerPage))
      } catch (error) {
        console.error('Error fetching posts:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [currentPage, selectedCategory, searchQuery])

  const handlePostClick = () => {
    playButtonSound()
  }

  // Read state is keyed by normalized_title (stable across title edits).
  const isPostRead = (normalizedTitle: string): boolean => {
    if (!normalizedTitle) return false
    const postData = likesData.find(like => like.normalized_title === normalizedTitle)
    return postData?.isLiked || false
  }

  const handleReadToggle = async (post: PostWithLikes) => {
    const slug = post.normalized_title
    if (!slug) return
    const currentStatus = isPostRead(slug)
    const newStatus = !currentStatus
    const currentLikes = post.likesCount || 0
    const newLikesCount = newStatus ? currentLikes + 1 : Math.max(0, currentLikes - 1)

    updateLikesData(slug, post.title, newLikesCount, newStatus)
    setAck(newStatus ? 'Acknowledged.' : 'Marked unread.')

    try {
      await fetch('/api/update-likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postTitle: slug, increment: newStatus }),
      })
    } catch (error) {
      console.error('Failed to update read status:', error)
    }
  }

  const handleInkHouseToggle = async (post: PostWithLikes) => {
    if (!adminToken || post.inkhouse_published) return

    setPublishingPostId(post.id)
    setInkHouseError(null)

    try {
      const response = await fetch('/api/admin/inkhouse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          postId: post.id,
          title: post.title,
          content: post.content,
          description: post.description || '',
          category: post.category || 'General',
          status: 'published',
          image_url: post.enclosure || post.image_url || ''
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Update local state
        setPosts(prevPosts => prevPosts.map(p =>
          p.id === post.id ? { ...p, inkhouse_published: true } : p
        ))
      } else {
        const errorMsg = data.error || data.details || `HTTP ${response.status}`
        setInkHouseError(errorMsg)
        console.error('InkHouse error:', errorMsg)
        setTimeout(() => setInkHouseError(null), 5000)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error'
      setInkHouseError(errorMsg)
      console.error('Failed to publish to InkHouse:', error)
      setTimeout(() => setInkHouseError(null), 5000)
    } finally {
      setPublishingPostId(null)
    }
  }

  const renderInkHouseControl = (post: PostWithLikes) => {
    if (!isAdmin || !adminMounted) return null

    const isPublished = post.inkhouse_published
    const isPublishing = publishingPostId === post.id

    return (
      <label
        className="inkhouse-toggle-label"
        onClick={(e) => e.stopPropagation()}
        title={isPublished ? "Published to InkHouse" : "Publish to InkHouse"}
      >
        <input
          type="checkbox"
          className="inkhouse-toggle-input"
          checked={isPublished}
          disabled={isPublished || isPublishing}
          onChange={() => handleInkHouseToggle(post)}
        />
        <span className={`inkhouse-toggle-slider ${isPublishing ? 'publishing' : ''}`}></span>
        <span className={`inkhouse-toggle-text ${isPublishing ? 'publishing' : ''}`}>
          {isPublished ? 'Published' : isPublishing ? 'Publishing...' : 'InkHouse'}
        </span>
      </label>
    )
  }

  const selectCategory = (cat: string) => {
    playButtonSound()
    setSelectedCategory(cat)
    setCurrentPage(1)
  }

  // Category on a feed card is itself a filter link. It lives inside the
  // card's <Link>, so it swallows the click instead of opening the post.
  const renderCategoryTag = (category?: string | null) => {
    if (!category) return null
    const go = (e: React.SyntheticEvent) => {
      e.preventDefault()
      e.stopPropagation()
      selectCategory(category)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    return (
      <span
        role="button"
        tabIndex={0}
        className={`rv-tag${selectedCategory === category ? ' on' : ''}`}
        data-tip={`Show all ${category}`}
        onClick={go}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') go(e) }}
      >
        {category}
      </span>
    )
  }

  const renderReadToggle = (post: PostWithLikes) => {
    const read = isPostRead(post.normalized_title)
    return (
      <span
        role="button"
        tabIndex={0}
        className={`rv-read${read ? ' on' : ''}`}
        data-tip={read ? 'Mark as unread' : 'Mark as read'}
        aria-label={read ? 'Mark as unread' : 'Mark as read'}
        aria-pressed={read}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); playButtonSound(); handleReadToggle(post) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); playButtonSound(); handleReadToggle(post) }
        }}
      >
        <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      </span>
    )
  }

  const logId = (post: PostWithLikes) => `LOG·${String(post.id).padStart(3, '0')}`

  const renderListView = () => (
    <div className="rv-cards">
      {posts.map((post, idx) => {
        // "LATEST" tag only on the truly-newest entry: first card of page 1
        // with no category filter and no search active.
        const isCurrent = idx === 0 && currentPage === 1 && !selectedCategory && !searchQuery
        return (
          <Link
            key={post.id}
            href={`/post/${post.normalized_title}`}
            className={`rv-card${isCurrent ? ' latest' : ''}${post.enclosure ? '' : ' noThumb'}`}
            onClick={handlePostClick}
          >
            {post.enclosure && (
              <div className="rv-thumb">
                <Image src={post.enclosure} alt={post.title} width={240} height={164} />
              </div>
            )}
            <div className="rv-cardBody">
              <div className="rv-logid">
                <Decoded text={logId(post)} />
                {isCurrent && <b> &middot; <Decoded text="LATEST" /></b>}
              </div>
              <div className="rv-titleRow">
                <h3 className="rv-title">{post.title}</h3>
                {renderCategoryTag(post.category)}
              </div>
              {post.description && <p className="rv-desc">{post.description}</p>}
              <div className="rv-meta">
                <span>Hari · {formatDate(post.pub_date)}</span>
                {renderInkHouseControl(post)}
                {renderReadToggle(post)}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )

  const renderGridView = () => (
    <div className="rv-grid">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/post/${post.normalized_title}`}
          className="rv-gridCard"
          onClick={handlePostClick}
        >
          {post.enclosure && (
            <div className="rv-gridThumb">
              <Image src={post.enclosure} alt={post.title} width={420} height={240} />
            </div>
          )}
          <div className="rv-logid"><Decoded text={logId(post)} /></div>
          <h3 className="rv-title">{post.title}</h3>
          {post.description && <p className="rv-desc">{post.description}</p>}
          <div className="rv-meta">
            <span>{formatDate(post.pub_date)}</span>
            {renderCategoryTag(post.category)}
            {renderInkHouseControl(post)}
            {renderReadToggle(post)}
          </div>
        </Link>
      ))}
    </div>
  )

  const renderCompactView = () => (
    <div className="rv-compact">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/post/${post.normalized_title}`}
          className="rv-compactRow"
          onClick={handlePostClick}
        >
          <span className="rv-compactDate">{formatDate(post.pub_date)}</span>
          <span className="rv-compactTitle">{post.title}</span>
          {renderCategoryTag(post.category)}
          {renderInkHouseControl(post)}
          {renderReadToggle(post)}
        </Link>
      ))}
    </div>
  )

  const renderMagazineView = () => {
    const [featured, ...rest] = posts
    return (
      <div className="rv-magazine">
        {featured && (
          <Link
            href={`/post/${featured.normalized_title}`}
            className="rv-magFeatured"
            onClick={handlePostClick}
          >
            {featured.enclosure && (
              <div className="rv-magImage">
                <Image src={featured.enclosure} alt={featured.title} width={900} height={420} />
              </div>
            )}
            <div className="rv-logid"><Decoded text={logId(featured)} /></div>
            <h2 className="rv-magTitle">{featured.title}</h2>
            {featured.description && <p className="rv-desc">{featured.description}</p>}
            <div className="rv-meta">
              <span>{formatDate(featured.pub_date)}</span>
              {renderCategoryTag(featured.category)}
              {renderReadToggle(featured)}
            </div>
          </Link>
        )}
        <div className="rv-magSecondary">
          {rest.map((post) => (
            <Link
              key={post.id}
              href={`/post/${post.normalized_title}`}
              className="rv-magItem"
              onClick={handlePostClick}
            >
              {post.enclosure && (
                <Image src={post.enclosure} alt={post.title} width={120} height={120} className="rv-magItemImage" />
              )}
              <div className="rv-magItemBody">
                <h4 className="rv-magItemTitle">{post.title}</h4>
                <div className="rv-meta">
                  <span>{formatDate(post.pub_date)}</span>
                  {renderReadToggle(post)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  const renderEmptyState = () => (
    <div className="rv-empty" role="status">
      <div className="rv-label">QUERY&middot;NULL</div>
      <p className="rv-emptyTitle">No records located</p>
      {searchQuery ? (
        <p className="rv-emptyText">No entries match &ldquo;<b>{searchQuery}</b>&rdquo;{selectedCategory && <> in <b>{selectedCategory}</b></>}</p>
      ) : (
        <p className="rv-emptyText">Database returned 0 entries for {selectedCategory ? <b>{selectedCategory}</b> : 'this filter'}.</p>
      )}
      {(searchQuery || selectedCategory) && (
        <button
          type="button"
          className="rv-btn"
          onClick={() => {
            playButtonSound()
            setSearchQuery('')
            setSelectedCategory('')
            setCurrentPage(1)
          }}
        >
          &larr; Clear query
        </button>
      )}
    </div>
  )

  const renderFeedContent = () => {
    if (posts.length === 0) {
      return renderEmptyState()
    }
    switch (viewMode) {
      case 'grid':
        return renderGridView()
      case 'compact':
        return renderCompactView()
      case 'magazine':
        return renderMagazineView()
      default:
        return renderListView()
    }
  }

  const pages = totalPages || 1
  const goPrev = () => { playButtonSound(); setCurrentPage((p) => Math.max(1, p - 1)) }
  const goNext = () => { playButtonSound(); setCurrentPage((p) => Math.min(pages, p + 1)) }
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <div className="rv rv-home">
      <Navbar />
      <AckToast message={ack} onDismiss={() => setAck(null)} />
      {accessingMessage && <AccessingOverlay fullscreen message={accessingMessage} />}
      {booting && !accessingMessage && (
        <AccessingOverlay
          fullscreen
          boot
          entryCount={totalPosts || undefined}
        />
      )}
      {showShortcuts && (
        <div
          className="rv-scOverlay"
          onClick={() => setShowShortcuts(false)}
          role="dialog"
          aria-label="Keyboard shortcuts and quick actions"
        >
          <div className="rv-scPanel" onClick={(e) => e.stopPropagation()}>
            <div className="rv-scHead">
              <span className="rv-label">CMD&middot;HELP</span>
              <button
                type="button"
                className="rv-ibtn"
                onClick={() => setShowShortcuts(false)}
                aria-label="Close shortcuts"
                data-tip="Close (Esc)"
              >
                &times;
              </button>
            </div>
            <h2 className="rv-scTitle">Shortcuts &middot; quick actions</h2>
            <p className="rv-scSub">Tap a row, or press the key on a keyboard.</p>
            <div className="rv-scList">
              <button
                type="button"
                className="rv-scRow"
                onClick={() => {
                  setShowShortcuts(false)
                  searchInputRef.current?.focus()
                }}
              >
                <kbd>/</kbd><span>Focus search</span>
              </button>
              <button
                type="button"
                className="rv-scRow"
                onClick={() => {
                  setShowShortcuts(false)
                  accessAndGo('/api/latest-post', 'ACCESSING NEWEST LOG')
                }}
              >
                <kbd>n</kbd><span>Open the newest log</span>
              </button>
              <button
                type="button"
                className="rv-scRow"
                onClick={() => {
                  setShowShortcuts(false)
                  accessAndGo('/api/random-post', 'ACCESSING RANDOM LOG')
                }}
              >
                <kbd>r</kbd><span>Open a random log</span>
              </button>
              <button
                type="button"
                className="rv-scRow"
                onClick={() => {
                  setShowShortcuts(false)
                  const subscribeBtn = document.querySelector<HTMLButtonElement>('.subscribe-icon-btn')
                  subscribeBtn?.click()
                }}
              >
                <kbd>s</kbd><span>Subscribe to newsletter</span>
              </button>
              <div className="rv-scRow static"><kbd>?</kbd><span>Toggle this panel</span></div>
              <div className="rv-scRow static"><kbd>Esc</kbd><span>Close this panel</span></div>
            </div>
          </div>
        </div>
      )}

      <header className="rv-intro">
        <h1 className="rv-introName">Hari</h1>
        <div className="rv-introSub rv-label">Notes · Essays · Logs · Since 2024</div>
      </header>

      <div className="rv-shell">
        <main className="rv-main">
          <div className="rv-topControls">
            {/* Row 1: view switcher + icon controls */}
            <div className="rv-headerRow">
              <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} labels />
              <div className="rv-actions controls-group">
                <SoundToggle />
                <ThemeToggle />
                <RSSFeedButton />
                <Subscribe />
                <a
                  href="/api/random-post"
                  rel="nofollow"
                  className="random-log-button"
                  title="Random log"
                  aria-label="Open a random log entry"
                  onClick={(e) => {
                    e.preventDefault()
                    playButtonSound()
                    accessAndGo('/api/random-post', 'ACCESSING RANDOM LOG')
                  }}
                >
                  <Shuffle size={15} />
                </a>
                <button
                  type="button"
                  className="help-button"
                  title="Keyboard shortcuts (?)"
                  aria-label="Show keyboard shortcuts"
                  onClick={() => {
                    playButtonSound()
                    setShowShortcuts(true)
                  }}
                >
                  <HelpCircle size={15} />
                </button>
              </div>
            </div>

            {/* Row 2: category dropdown (≤1000px only) + search + pager */}
            <div className="rv-toolbar">
              <select
                className="rv-field rv-catSelect"
                aria-label="Category"
                value={selectedCategory}
                onChange={(e) => selectCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="rv-toolRight">
                <label
                  className={`rv-search${searchQuery ? ' open' : ''}`}
                  data-tip="Search ( / )"
                >
                  <span className="rv-searchIcon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></svg>
                  </span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search entries…"
                    aria-label="Search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.currentTarget.blur()
                        return
                      }
                      if (e.key.length === 1 || e.key === 'Backspace') {
                        playKeypadBeep()
                      }
                    }}
                  />
                </label>
                <div className="rv-pager">
                  <button className="rv-ibtn" onClick={goPrev} disabled={currentPage === 1} data-tip="Previous page" aria-label="Previous page">←</button>
                  <b>{currentPage}</b><span>/{pages}</span>
                  <button className="rv-ibtn" onClick={goNext} disabled={currentPage >= pages} data-tip="Next page" aria-label="Next page">→</button>
                </div>
              </div>
            </div>
          </div>

          {inkHouseError && (
            <div className="rv-error">InkHouse error: {inkHouseError}</div>
          )}
          <div className="rv-feed">
            {loading ? (
              // Skip the in-content loader while the boot overlay is already
              // covering the screen — otherwise two loaders fire at once.
              booting ? null : <div className="rv-loader" aria-label="Loading"><span /></div>
            ) : (
              renderFeedContent()
            )}
          </div>

          {!loading && posts.length > 0 && (
            <nav className="rv-bottomPager" aria-label="Pagination">
              <button className="rv-btn" onClick={() => { goPrev(); scrollTop() }} disabled={currentPage === 1}>← Newer</button>
              <span className="rv-label">Page <b>{currentPage}</b> of {pages}</span>
              <button className="rv-btn" onClick={() => { goNext(); scrollTop() }} disabled={currentPage >= pages}>Older →</button>
            </nav>
          )}
        </main>

        <aside className="rv-sidebar">
          <section className="rv-widget">
            <div className="rv-widgetHead"><span className="name">About</span><span className="code">01</span></div>
            <p>
              I am Haripriya. Welcome to my corner of the internet. I write about life, tech, and everything in between. Thanks for stopping by!
            </p>
            {/* Apps link hidden — restore by uncommenting.
            <a className="rv-link" href="https://apps.haripriya.org" target="_blank" rel="noopener noreferrer">View My Apps →</a>
            */}
            {/* Coffee link hidden — restore by uncommenting this line.
                <CoffeeLink text="Buy me a coffee →" /> */}
          </section>

          <section className="rv-widget">
            <div className="rv-widgetHead"><span className="name">Categories</span><span className="code">02</span></div>
            <nav className="rv-catList" aria-label="Categories">
              <button className={selectedCategory === '' ? 'on' : ''} onClick={() => selectCategory('')}>All categories</button>
              {categories.map((cat) => (
                <button key={cat} className={selectedCategory === cat ? 'on' : ''} onClick={() => selectCategory(cat)}>
                  {cat}
                </button>
              ))}
            </nav>
          </section>

          <section className="rv-widget">
            <div className="rv-widgetHead"><span className="name">Stats</span><span className="code">03</span></div>
            <div className="rv-stats">
              <div className="rv-stat"><div className="n">{totalPosts || 79}</div><div className="l">Posts</div></div>
              <div className="rv-stat"><div className="n">{categories.length}</div><div className="l">Categories</div></div>
            </div>
          </section>
        </aside>

        {/* ≤1000px: sidebar folds into this strip below the feed */}
        <div className="rv-mobileWidgets">
          <div className="rv-stat"><div className="n">{totalPosts || 79}</div><div className="l">Posts</div></div>
          <div className="rv-stat"><div className="n">{categories.length}</div><div className="l">Categories</div></div>
          <p>I am Haripriya. Welcome to my corner of the internet. I write about life, tech, and everything in between.</p>
          {/* Coffee link hidden — restore by uncommenting this line.
              <CoffeeLink text="Buy me a coffee" /> */}
        </div>

        <footer className="rv-footStrip" aria-label="System status">
          <span className="rv-label"><b>{totalPosts || 0}</b> entries</span>
          <span className="rv-label"><b>{categories.length}</b> categories</span>
          <span className="rv-label">Active since 2024</span>
          <button
            type="button"
            className="rv-link rv-label"
            onClick={() => setShowShortcuts(true)}
            aria-label="Show keyboard shortcuts"
          >
            Press ? for help
          </button>
        </footer>
      </div>
    </div>
  )
}
