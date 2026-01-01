'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Navbar } from '@/components/layout'
import { ThemeToggle, SoundToggle } from '@/components/common'
import { RSSFeedButton, Subscribe, CoffeeLink } from '@/components/widgets'
import ViewSwitcher, { ViewMode } from '@/components/ViewSwitcher'
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
  const [posts, setPosts] = useState<PostWithLikes[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalPosts, setTotalPosts] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const postsPerPage = 10

  const router = useRouter()
  const { likesData, updateLikesData } = useLikes()
  const { playButtonSound, playKeypadBeep } = useSounds()
  const { isAdmin, adminToken, mounted: adminMounted } = useAdmin()
  const [publishingPostId, setPublishingPostId] = useState<number | null>(null)
  const [inkHouseError, setInkHouseError] = useState<string | null>(null)

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

  const handlePostClick = (normalizedTitle: string) => {
    playButtonSound()
    router.push(`/post/${normalizedTitle}`)
  }

  const isPostRead = (title: string): boolean => {
    const postData = likesData.find(like => like.title === title)
    return postData?.isLiked || false
  }

  const handleReadToggle = async (title: string) => {
    const currentStatus = isPostRead(title)
    const newStatus = !currentStatus
    const postData = likesData.find(like => like.title === title)
    const currentLikes = postData?.likesCount || 0
    const newLikesCount = newStatus ? currentLikes + 1 : Math.max(0, currentLikes - 1)

    // Update locally first
    updateLikesData(title, newLikesCount, newStatus)

    // Update on server - find post to get normalized_title
    const post = posts.find(p => p.title === title)
    if (post) {
      try {
        await fetch('/api/update-likes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postTitle: post.normalized_title, increment: newStatus }),
        })
      } catch (error) {
        console.error('Failed to update read status:', error)
      }
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
        <div
          key={post.id}
          className="list-item"
          onClick={() => handlePostClick(post.normalized_title)}
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
                  onClick={(e) => { e.stopPropagation(); playButtonSound(); handleReadToggle(post.title); }}
                  title={isPostRead(post.title) ? "Mark as unread" : "Mark as read"}
                  style={{ display: 'none' }}
                >
                  {isPostRead(post.title) ? (
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
        </div>
      ))}
    </div>
  )

  const renderGridView = () => (
    <div className="view-grid">
      {posts.map((post) => (
        <div
          key={post.id}
          className="grid-card"
          onClick={() => handlePostClick(post.normalized_title)}
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
                onClick={(e) => { e.stopPropagation(); playButtonSound(); handleReadToggle(post.title); }}
                title={isPostRead(post.title) ? "Mark as unread" : "Mark as read"}
                style={{ display: 'none' }}
              >
                {isPostRead(post.title) ? (
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
      ))}
    </div>
  )

  const renderCompactView = () => (
    <div className="view-compact">
      {posts.map((post) => (
        <div
          key={post.id}
          className="compact-item"
          onClick={() => handlePostClick(post.normalized_title)}
        >
          <span className="compact-date">{formatDate(post.pub_date)}</span>
          <span className="compact-title">{post.title}</span>
          {post.category && (
            <span className="compact-category">{post.category}</span>
          )}
          {renderInkHouseControl(post)}
          <span
            className="compact-read-icon favorite-icon read-icon"
            onClick={(e) => { e.stopPropagation(); playButtonSound(); handleReadToggle(post.title); }}
            title={isPostRead(post.title) ? "Mark as unread" : "Mark as read"}
            style={{ display: 'none' }}
          >
            {isPostRead(post.title) ? (
              <svg className="heart-icon liked" viewBox="0 0 16 16" height="1em" width="1em" fill="currentColor">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
              </svg>
            ) : (
              <svg className="heart-icon not-liked" viewBox="0 0 16 16" height="1em" width="1em" fill="currentColor">
                <path d="M4 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm2.625.547a3 3 0 0 0-5.584.953H.5a.5.5 0 0 0 0 1h.541A3 3 0 0 0 7 8a1 1 0 0 1 2 0 3 3 0 0 0 5.959.5h.541a.5.5 0 0 0 0-1h-.541a3 3 0 0 0-5.584-.953A1.993 1.993 0 0 0 8 6c-.532 0-1.016.208-1.375.547zM14 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
              </svg>
            )}
          </span>
        </div>
      ))}
    </div>
  )

  const renderMagazineView = () => {
    const [featured, ...rest] = posts
    return (
      <div className="view-magazine">
        {featured && (
          <div
            className="magazine-featured"
            onClick={() => handlePostClick(featured.normalized_title)}
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
                  onClick={(e) => { e.stopPropagation(); playButtonSound(); handleReadToggle(featured.title); }}
                  title={isPostRead(featured.title) ? "Mark as unread" : "Mark as read"}
                >
                  {isPostRead(featured.title) ? (
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
        )}
        <div className="magazine-secondary">
          {rest.map((post) => (
            <div
              key={post.id}
              className="magazine-item"
              onClick={() => handlePostClick(post.normalized_title)}
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
                    onClick={(e) => { e.stopPropagation(); playButtonSound(); handleReadToggle(post.title); }}
                    title={isPostRead(post.title) ? "Mark as unread" : "Mark as read"}
                  >
                    {isPostRead(post.title) ? (
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
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderFeedContent = () => {
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
                    type="text"
                    className="search-input"
                    placeholder="Search..."
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
                  Welcome to my corner of the internet. I write about life, tech, and everything in between.
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
              <h3 className="sidebar-widget-title">About</h3>
              <div className="sidebar-about">
                <p className="sidebar-about-text">
                  Welcome to my corner of the internet. I write about life, tech, and everything in between. Thanks for stopping by!
                </p>
                <div className="sidebar-about-links">
                  <a href="https://apps.haripriya.org" target="_blank" rel="noopener noreferrer">
                    View My Apps →
                  </a>
                  <CoffeeLink text="Buy me a coffee →" />
                </div>
              </div>
            </div>

            <div className="sidebar-widget">
              <h3 className="sidebar-widget-title">Blog Stats</h3>
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
              <h3 className="sidebar-widget-title">Categories</h3>
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
      </div>
    </>
  )
}
