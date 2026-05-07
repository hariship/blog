'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/layout'
import { ThemeToggle, SoundToggle } from '@/components/common'
import { RSSFeedButton, Subscribe, CoffeeLink } from '@/components/widgets'
import { Shuffle, HelpCircle } from 'lucide-react'
import ViewSwitcher, { ViewMode } from '@/components/ViewSwitcher'
import AccessingOverlay from '@/components/AccessingOverlay'
import { useLikes } from '@/contexts/LikesContext'
import { useSounds } from '@/contexts/SoundContext'
import { useAdmin } from '@/contexts/AdminContext'
import { PostWithLikes } from '@/types'
import './RSSFeed.css'

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

export default function HomePage() {
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

  const renderListView = () => (
    <div className="view-list">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/post/${post.normalized_title}`}
          className="list-item"
          onClick={handlePostClick}
          style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
        >
          <div className="list-item-content">
            {post.enclosure && (
              <div className="list-item-image">
                <Image
                  src={post.enclosure}
                  alt={post.title}
                  width={120}
                  height={80}
                  style={{ objectFit: 'cover' }}
                />
              </div>
            )}
            <div className="list-item-text">
              <span className="list-item-log-id">LOG&middot;{String(post.id).padStart(3, '0')}</span>
              <div className="list-item-header">
                <h3 className="list-item-title">{post.title}</h3>
                {post.category && (
                  <span className="list-item-category">{post.category}</span>
                )}
              </div>
              {post.description && (
                <p className="list-item-description">{post.description}</p>
              )}
              <div className="list-item-meta">
                <span>Hari · {formatDate(post.pub_date)}</span>
                {renderInkHouseControl(post)}
                <span
                  className="favorite-icon read-icon"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); playButtonSound(); handleReadToggle(post); }}
                  title={isPostRead(post.normalized_title) ? "Mark as unread" : "Mark as read"}
                >
                  {isPostRead(post.normalized_title) ? (
                    <svg className="heart-icon liked" viewBox="0 0 16 16" height="1.2em" width="1.2em" fill="currentColor">
                      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                    </svg>
                  ) : (
                    <svg className="heart-icon not-liked" viewBox="0 0 16 16" height="1.2em" width="1.2em" fill="currentColor">
                      <path d="M4 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm2.625.547a3 3 0 0 0-5.584.953H.5a.5.5 0 0 0 0 1h.541A3 3 0 0 0 7 8a1 1 0 0 1 2 0 3 3 0 0 0 5.959.5h.541a.5.5 0 0 0 0-1h-.541a3 3 0 0 0-5.584-.953A1.993 1.993 0 0 0 8 6c-.532 0-1.016.208-1.375.547zM14 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
                    </svg>
                  )}
                </span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )

  const renderGridView = () => (
    <div className="view-grid">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/post/${post.normalized_title}`}
          className="grid-card"
          onClick={handlePostClick}
          style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
        >
          {post.enclosure && (
            <div className="grid-card-image">
              <Image
                src={post.enclosure}
                alt={post.title}
                width={280}
                height={180}
                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              />
            </div>
          )}
          <div className="grid-card-content">
            <h3 className="grid-card-title">{post.title}</h3>
            {post.description && (
              <p className="grid-card-description">{post.description}</p>
            )}
            <div className="grid-card-meta">
              <span>{formatDate(post.pub_date)}</span>
              {post.category && <span>{post.category}</span>}
              {renderInkHouseControl(post)}
              <span
                className="favorite-icon read-icon"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); playButtonSound(); handleReadToggle(post); }}
                title={isPostRead(post.normalized_title) ? "Mark as unread" : "Mark as read"}
              >
                {isPostRead(post.normalized_title) ? (
                  <svg className="heart-icon liked" viewBox="0 0 16 16" height="1.2em" width="1.2em" fill="currentColor">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                  </svg>
                ) : (
                  <svg className="heart-icon not-liked" viewBox="0 0 16 16" height="1.2em" width="1.2em" fill="currentColor">
                    <path d="M4 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm2.625.547a3 3 0 0 0-5.584.953H.5a.5.5 0 0 0 0 1h.541A3 3 0 0 0 7 8a1 1 0 0 1 2 0 3 3 0 0 0 5.959.5h.541a.5.5 0 0 0 0-1h-.541a3 3 0 0 0-5.584-.953A1.993 1.993 0 0 0 8 6c-.532 0-1.016.208-1.375.547zM14 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
                  </svg>
                )}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )

  const renderCompactView = () => (
    <div className="view-compact">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/post/${post.normalized_title}`}
          className="compact-item"
          onClick={handlePostClick}
          style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}
        >
          <span className="compact-date">{formatDate(post.pub_date)}</span>
          <span className="compact-title">{post.title}</span>
          {post.category && (
            <span className="compact-category">{post.category}</span>
          )}
          {renderInkHouseControl(post)}
          <span
            className="compact-read-icon favorite-icon read-icon"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); playButtonSound(); handleReadToggle(post); }}
            title={isPostRead(post.normalized_title) ? "Mark as unread" : "Mark as read"}
          >
            {isPostRead(post.normalized_title) ? (
              <svg className="heart-icon liked" viewBox="0 0 16 16" height="1em" width="1em" fill="currentColor">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
              </svg>
            ) : (
              <svg className="heart-icon not-liked" viewBox="0 0 16 16" height="1em" width="1em" fill="currentColor">
                <path d="M4 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm2.625.547a3 3 0 0 0-5.584.953H.5a.5.5 0 0 0 0 1h.541A3 3 0 0 0 7 8a1 1 0 0 1 2 0 3 3 0 0 0 5.959.5h.541a.5.5 0 0 0 0-1h-.541a3 3 0 0 0-5.584-.953A1.993 1.993 0 0 0 8 6c-.532 0-1.016.208-1.375.547zM14 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
              </svg>
            )}
          </span>
        </Link>
      ))}
    </div>
  )

  const renderMagazineView = () => {
    const [featured, ...rest] = posts
    return (
      <div className="view-magazine">
        {featured && (
          <Link
            href={`/post/${featured.normalized_title}`}
            className="magazine-featured"
            onClick={handlePostClick}
            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
          >
            {featured.enclosure && (
              <div className="magazine-featured-image">
                <Image
                  src={featured.enclosure}
                  alt={featured.title}
                  width={600}
                  height={300}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              </div>
            )}
            <div className="magazine-featured-content">
              <h2 className="magazine-featured-title">{featured.title}</h2>
              {featured.description && (
                <p className="magazine-featured-description">{featured.description}</p>
              )}
              <div className="magazine-featured-meta">
                <span>{formatDate(featured.pub_date)}</span>
                {featured.category && (
                  <span className="magazine-featured-category">{featured.category}</span>
                )}
                <span
                  className="favorite-icon read-icon"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); playButtonSound(); handleReadToggle(featured); }}
                  title={isPostRead(featured.normalized_title) ? "Mark as unread" : "Mark as read"}
                >
                  {isPostRead(featured.normalized_title) ? (
                    <svg className="heart-icon liked" viewBox="0 0 16 16" height="1.2em" width="1.2em" fill="currentColor">
                      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                    </svg>
                  ) : (
                    <svg className="heart-icon not-liked" viewBox="0 0 16 16" height="1.2em" width="1.2em" fill="currentColor">
                      <path d="M4 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm2.625.547a3 3 0 0 0-5.584.953H.5a.5.5 0 0 0 0 1h.541A3 3 0 0 0 7 8a1 1 0 0 1 2 0 3 3 0 0 0 5.959.5h.541a.5.5 0 0 0 0-1h-.541a3 3 0 0 0-5.584-.953A1.993 1.993 0 0 0 8 6c-.532 0-1.016.208-1.375.547zM14 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
                    </svg>
                  )}
                </span>
              </div>
            </div>
          </Link>
        )}
        <div className="magazine-secondary">
          {rest.map((post) => (
            <Link
              key={post.id}
              href={`/post/${post.normalized_title}`}
              className="magazine-item"
              onClick={handlePostClick}
              style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}
            >
              {post.enclosure && (
                <Image
                  src={post.enclosure}
                  alt={post.title}
                  width={60}
                  height={60}
                  className="magazine-item-image"
                  style={{ objectFit: 'cover' }}
                />
              )}
              <div className="magazine-item-content">
                <h4 className="magazine-item-title">{post.title}</h4>
                <div className="magazine-item-meta">
                  <span className="magazine-item-date">{formatDate(post.pub_date)}</span>
                  <span
                    className="magazine-read-icon favorite-icon read-icon"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); playButtonSound(); handleReadToggle(post); }}
                    title={isPostRead(post.normalized_title) ? "Mark as unread" : "Mark as read"}
                  >
                    {isPostRead(post.normalized_title) ? (
                      <svg className="heart-icon liked" viewBox="0 0 16 16" height="0.9em" width="0.9em" fill="currentColor">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                      </svg>
                    ) : (
                      <svg className="heart-icon not-liked" viewBox="0 0 16 16" height="0.9em" width="0.9em" fill="currentColor">
                        <path d="M4 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm2.625.547a3 3 0 0 0-5.584.953H.5a.5.5 0 0 0 0 1h.541A3 3 0 0 0 7 8a1 1 0 0 1 2 0 3 3 0 0 0 5.959.5h.541a.5.5 0 0 0 0-1h-.541a3 3 0 0 0-5.584-.953A1.993 1.993 0 0 0 8 6c-.532 0-1.016.208-1.375.547zM14 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
                      </svg>
                    )}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  const renderEmptyState = () => (
    <div className="feed-empty-state" role="status">
      <span className="feed-empty-code">QUERY&middot;NULL</span>
      <p className="feed-empty-title">NO RECORDS LOCATED</p>
      {searchQuery ? (
        <p className="feed-empty-text">
          NO ENTRIES MATCH &ldquo;{searchQuery}&rdquo;
        </p>
      ) : (
        <p className="feed-empty-text">
          DATABASE RETURNED 0 ENTRIES FOR THIS FILTER.
        </p>
      )}
      {(searchQuery || selectedCategory) && (
        <button
          type="button"
          className="feed-empty-clear"
          onClick={() => {
            playButtonSound()
            setSearchQuery('')
            setSelectedCategory('')
            setCurrentPage(1)
          }}
        >
          <span className="feed-empty-clear-arrow">&larr;</span>
          <span>CLEAR QUERY</span>
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

  return (
    <>
      <Navbar />
      {accessingMessage && <AccessingOverlay fullscreen message={accessingMessage} />}
      {showShortcuts && (
        <div
          className="shortcuts-overlay"
          onClick={() => setShowShortcuts(false)}
          role="dialog"
          aria-label="Keyboard shortcuts and quick actions"
        >
          <div
            className="shortcuts-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shortcuts-header">
              <span className="shortcuts-code">CMD&middot;HELP</span>
              <button
                type="button"
                className="shortcuts-close"
                onClick={() => setShowShortcuts(false)}
                aria-label="Close shortcuts"
              >
                &times;
              </button>
            </div>
            <h2 className="shortcuts-title">SHORTCUTS &middot; QUICK ACTIONS</h2>
            <p className="shortcuts-subtitle">Tap a row, or press the key on a keyboard.</p>
            <div className="shortcuts-list">
              <button
                type="button"
                className="shortcuts-row shortcuts-row-action"
                onClick={() => {
                  setShowShortcuts(false)
                  searchInputRef.current?.focus()
                }}
              >
                <span className="shortcuts-key"><kbd>/</kbd></span>
                <span className="shortcuts-desc">Focus search</span>
              </button>
              <button
                type="button"
                className="shortcuts-row shortcuts-row-action"
                onClick={() => {
                  setShowShortcuts(false)
                  accessAndGo('/api/latest-post', 'ACCESSING NEWEST LOG')
                }}
              >
                <span className="shortcuts-key"><kbd>n</kbd></span>
                <span className="shortcuts-desc">Open the newest log</span>
              </button>
              <button
                type="button"
                className="shortcuts-row shortcuts-row-action"
                onClick={() => {
                  setShowShortcuts(false)
                  accessAndGo('/api/random-post', 'ACCESSING RANDOM LOG')
                }}
              >
                <span className="shortcuts-key"><kbd>r</kbd></span>
                <span className="shortcuts-desc">Open a random log</span>
              </button>
              <button
                type="button"
                className="shortcuts-row shortcuts-row-action"
                onClick={() => {
                  setShowShortcuts(false)
                  const subscribeBtn = document.querySelector<HTMLButtonElement>('.subscribe-icon-btn')
                  subscribeBtn?.click()
                }}
              >
                <span className="shortcuts-key"><kbd>s</kbd></span>
                <span className="shortcuts-desc">Subscribe to newsletter</span>
              </button>
              <div className="shortcuts-row shortcuts-row-static">
                <span className="shortcuts-key"><kbd>?</kbd></span>
                <span className="shortcuts-desc">Toggle this panel</span>
              </div>
              <div className="shortcuts-row shortcuts-row-static">
                <span className="shortcuts-key"><kbd>Esc</kbd></span>
                <span className="shortcuts-desc">Close this panel</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="rss-feed">
        <div className="rss-feed-layout">
          <div className="rss-feed-main">
            {/* Header */}
            <div className="blog-header">
              <div className="nav-home-container">
                <div className="desktop-view-switcher">
                  <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />
                </div>
                <div className="mobile-view-switcher">
                  <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} hideMagazine />
                </div>
              </div>
              <div className="header-controls">
                <div className="controls-group">
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
                    <Shuffle size={18} />
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
                    <HelpCircle size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="category-dropdown">
              <div className="filter-controls">
                <div className="filter-section">
                  <select
                    className="category-select"
                    value={selectedCategory}
                    onChange={(e) => {
                      playButtonSound()
                      setSelectedCategory(e.target.value)
                      setCurrentPage(1)
                    }}
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="search-section">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="search-input"
                    placeholder="Search...  (press /)"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    onKeyDown={(e) => {
                      if (e.key.length === 1 || e.key === 'Backspace') {
                        playKeypadBeep()
                      }
                    }}
                  />
                </div>
                <div className="pagination-controls-inline">
                  <button
                    className="pagination-button"
                    onClick={() => {
                      playButtonSound()
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }}
                    disabled={currentPage === 1}
                  >
                    ←
                  </button>
                  <span className="pagination-info">
                    {currentPage}/{totalPages || 1}
                  </span>
                  <button
                    className="pagination-button"
                    onClick={() => {
                      playButtonSound()
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    →
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            {inkHouseError && (
              <div className="inkhouse-error-banner">
                InkHouse error: {inkHouseError}
              </div>
            )}
            <div className="rss-feed-list">
              {loading ? (
                <div className="loader"></div>
              ) : (
                <div className="feed-content">{renderFeedContent()}</div>
              )}
            </div>

            {/* Mobile Widgets */}
            <div className="mobile-widgets">
              <div className="mobile-widget mobile-stats-widget">
                <div className="mobile-stat-item">
                  <span className="mobile-stat-value">{totalPosts || 79}</span>
                  <span className="mobile-stat-label">Posts</span>
                </div>
                <div className="mobile-stat-separator"></div>
                <div className="mobile-stat-item">
                  <span className="mobile-stat-value">{categories.length}</span>
                  <span className="mobile-stat-label">Categories</span>
                </div>
              </div>
              <div className="mobile-widget">
                <h4 className="mobile-widget-title">About</h4>
                <p className="mobile-about-text">
                  I am Haripriya. Welcome to my corner of the internet. I write about life, tech, and everything in between.
                </p>
                <div className="mobile-about-links">
                  <CoffeeLink text="Buy me a coffee" />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="rss-feed-sidebar">
            <div className="sidebar-widget">
              <h3 className="sidebar-widget-title">
                <span className="widget-code">01</span>
                <span>About</span>
              </h3>
              <div className="sidebar-about">
                <p className="sidebar-about-text">
                  I am Haripriya. Welcome to my corner of the internet. I write about life, tech, and everything in between. Thanks for stopping by!
                </p>
                <div className="sidebar-about-links">
                  {/* TODO: re-enable once a /now entry is written.
                      <Link href="/now">What I&apos;m up to now →</Link> */}
                  <a href="https://apps.haripriya.org" target="_blank" rel="noopener noreferrer">
                    View My Apps →
                  </a>
                  <CoffeeLink text="Buy me a coffee →" />
                </div>
              </div>
            </div>

            <div className="sidebar-widget">
              <h3 className="sidebar-widget-title">
                <span className="widget-code">02</span>
                <span>Blog Stats</span>
              </h3>
              <div className="sidebar-stats">
                <div className="sidebar-stat-item">
                  <span className="sidebar-stat-value">{totalPosts || 79}</span>
                  <span className="sidebar-stat-label">Posts</span>
                </div>
                <div className="sidebar-stat-item">
                  <span className="sidebar-stat-value">{categories.length}</span>
                  <span className="sidebar-stat-label">Categories</span>
                </div>
              </div>
            </div>

            <div className="sidebar-widget">
              <h3 className="sidebar-widget-title">
                <span className="widget-code">03</span>
                <span>Categories</span>
              </h3>
              <div className="sidebar-categories">
                <button
                  className={`sidebar-category-btn ${selectedCategory === '' ? 'active' : ''}`}
                  onClick={() => {
                    playButtonSound()
                    setSelectedCategory('')
                    setCurrentPage(1)
                  }}
                >
                  All
                </button>
                {categories.slice(0, 8).map((cat) => (
                  <button
                    key={cat}
                    className={`sidebar-category-btn ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => {
                      playButtonSound()
                      setSelectedCategory(cat)
                      setCurrentPage(1)
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
        <footer className="feed-footer-strip" aria-label="System status">
          <span className="feed-footer-segment">{totalPosts || 0} ENTRIES</span>
          <span className="feed-footer-divider">&middot;</span>
          <span className="feed-footer-segment">{categories.length} CATEGORIES</span>
          <span className="feed-footer-divider">&middot;</span>
          <span className="feed-footer-segment">ACTIVE SINCE 2020</span>
          <span className="feed-footer-divider">&middot;</span>
          <button
            type="button"
            className="feed-footer-help"
            onClick={() => setShowShortcuts(true)}
            aria-label="Show keyboard shortcuts"
          >
            PRESS ? FOR HELP
          </button>
        </footer>
      </div>
    </>
  )
}
