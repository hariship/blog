'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import parse from 'html-react-parser'
import { IoIosArrowBack } from 'react-icons/io'
import { Home } from 'lucide-react'
import { useLikes } from '@/contexts/LikesContext'
import { useSounds } from '@/contexts/SoundContext'
import { useAdmin } from '@/contexts/AdminContext'
import { CommentsWidget } from '@/components/widgets'
import { ThemeToggle, SoundToggle } from '@/components/common'
import type { PostData, AdjacentPost } from './page'
import AckToast from '@/components/AckToast'
import Decoded from '@/components/Decoded'
import './Post.css'
import './PostRevamp.css'

interface PostClientProps {
  title: string
  initialPost?: PostData | null
  adjacent?: { prev: AdjacentPost | null; next: AdjacentPost | null }
}

const normalizeTitle = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s\-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

const formatDate = (dateString: string): string => {
  try {
    if (typeof dateString === 'string' && dateString.match(/^[A-Za-z]{3}\s\d{1,2}$/)) {
      return dateString
    }
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return dateString || 'Mar 30'
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()
    return `${month} ${day} ${year}`
  } catch {
    return dateString
  }
}

export default function PostClient({ title, initialPost, adjacent }: PostClientProps) {
  const [postContent, setPostContent] = useState<string>(initialPost?.content || '')
  const [postTitle, setPostTitle] = useState<string>(initialPost?.title || '')
  const [postDate, setPostDate] = useState<string>(initialPost?.pub_date || '')
  const [postCategory, setPostCategory] = useState<string>(initialPost?.category || '')
  const [postImage, setPostImage] = useState<string>(initialPost?.enclosure || '')
  const [postDescription, setPostDescription] = useState<string>(initialPost?.description || '')
  const [postUpdatedAt, setPostUpdatedAt] = useState<string>(initialPost?.updated_at || '')
  const { likesData, updateLikesData } = useLikes()
  const [likesCount, setLikesCount] = useState<number>(initialPost?.likesCount || 0)
  const [isLiked, setIsLiked] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(!initialPost)
  const [showComments, setShowComments] = useState<boolean>(true)
  const [postId, setPostId] = useState<number | null>(initialPost?.id || null)
  const [inkHousePublished, setInkHousePublished] = useState<boolean>(initialPost?.inkhouse_published || false)
  const [isPublishingToInkHouse, setIsPublishingToInkHouse] = useState<boolean>(false)
  const [inkHouseMessage, setInkHouseMessage] = useState<string | null>(null)
  const [isSendingNewsletter, setIsSendingNewsletter] = useState<boolean>(false)
  const [newsletterMessage, setNewsletterMessage] = useState<string | null>(null)
  // Computer-voice ack toast shown after a successful read-toggle.
  const [ack, setAck] = useState<string | null>(null)
  // Image lightbox: click any picture in the post to see it bigger.
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null) }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [lightbox])

  const handleContentClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement
    if (target.tagName !== 'IMG') return
    // Images wrapped in a link keep behaving like links.
    if (target.closest('a')) return
    const img = target as HTMLImageElement
    playButtonSound()
    setLightbox({ src: img.currentSrc || img.src, alt: img.alt || '' })
  }

  const router = useRouter()
  const { playButtonSound } = useSounds()
  const { isAdmin, adminToken, mounted: adminMounted } = useAdmin()
  const normalized = normalizeTitle(title || '')
  const isJournal = normalized === 'life-lately-20-2025'

  // Read state is keyed by normalized_title (stable across title edits).
  const getReadStatusFromStorage = (slug: string): boolean => {
    try {
      const stored = localStorage.getItem('readPosts')
      if (stored) {
        const readPosts = JSON.parse(stored)
        return readPosts.includes(slug)
      }
      return false
    } catch {
      return false
    }
  }

  const fetchPostContent = async (postTitleFromURL: string) => {
    const normalizedTitle = normalizeTitle(postTitleFromURL)

    try {
      const response = await fetch(`/api/post/${normalizedTitle}`)
      if (!response.ok) {
        throw new Error('Post not found')
      }

      const post = await response.json()

      if (post) {
        const { content, title, pub_date, category, enclosure } = post
        setPostTitle(title)
        setPostDate(pub_date)
        setPostCategory(category)
        setPostContent(content || 'No content available')
        setPostImage(enclosure || '')

        const slug = post.normalized_title || normalizeTitle(title || '')
        const isReadInStorage = getReadStatusFromStorage(slug)
        const postLikesData = likesData.find(like => like.normalized_title === slug)
        if (postLikesData) {
          setLikesCount(postLikesData.likesCount)
          setIsLiked(postLikesData.isLiked)
        } else {
          setLikesCount(0)
          setIsLiked(isReadInStorage)
        }
      }
    } catch (error) {
      console.error('Error fetching post content:', error)
    } finally {
      setLoading(false)
    }
  }

  // Sync initialPost prop to state when it changes (for client-side navigation)
  useEffect(() => {
    if (initialPost) {
      setPostContent(initialPost.content || '')
      setPostTitle(initialPost.title || '')
      setPostDate(initialPost.pub_date || '')
      setPostCategory(initialPost.category || '')
      setPostImage(initialPost.enclosure || '')
      setPostDescription(initialPost.description || '')
      setPostUpdatedAt(initialPost.updated_at || '')
      setLikesCount(initialPost.likesCount || 0)
      setPostId(initialPost.id || null)
      setInkHousePublished(initialPost.inkhouse_published || false)
      setLoading(false)
    }
  }, [initialPost])

  useEffect(() => {
    // Only fetch if no initial post data was provided (client-side navigation fallback)
    if (title && !initialPost) {
      fetchPostContent(title)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, initialPost])

  useEffect(() => {
    if (normalized && likesData.length > 0) {
      const postLikesData = likesData.find(like => like.normalized_title === normalized)
      if (postLikesData) {
        setIsLiked(postLikesData.isLiked)
        setLikesCount(postLikesData.likesCount)
      } else {
        // Fall back to direct localStorage check so newly-marked posts
        // that aren't in the cached RSS dataset still reflect.
        setIsLiked(getReadStatusFromStorage(normalized))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [likesData, normalized])

  // Update page title
  useEffect(() => {
    if (postTitle) {
      document.title = postTitle
    }
  }, [postTitle])

  // Back: prefer real browser history so any home-page filter/search/scroll
  // state is restored. Fall back to /  for direct landings (no history).
  const handleGoBack = () => {
    playButtonSound()
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  const handleGoHome = () => {
    playButtonSound()
    router.push('/')
  }

  const handleLikeToggle = async () => {
    const previousIsLiked = isLiked
    const previousLikesCount = likesCount
    const newIsLiked = !isLiked
    const updatedLikesCount = newIsLiked ? likesCount + 1 : likesCount - 1

    updateLikesData(normalized, postTitle, updatedLikesCount, newIsLiked)
    setIsLiked(newIsLiked)
    setLikesCount(updatedLikesCount)
    setAck(newIsLiked ? 'Acknowledged.' : 'Marked unread.')

    try {
      const response = await fetch('/api/update-likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postTitle: normalized, increment: newIsLiked }),
      })

      if (!response.ok) {
        throw new Error('Failed to update likes')
      }
    } catch (error) {
      console.error('Failed to update likes:', error)
      updateLikesData(normalized, postTitle, previousLikesCount, previousIsLiked)
      setIsLiked(previousIsLiked)
      setLikesCount(previousLikesCount)
      setAck(null)
    }
  }

  const TOGGLE_END_SENTINEL = '__BLOG_END_TOGGLE__'

  const processToggleBlocks = (htmlContent: string): string => {
    if (!htmlContent) return htmlContent

    // Replace non-breaking spaces with regular spaces for proper word wrapping.
    // Quill emits typed spaces as either &nbsp; entity or the literal U+00A0
    // character. Either form makes the surrounding text one unbreakable unit
    // and overflows narrow containers (toggle boxes especially). Convert all
    // forms to plain space so the browser can wrap at word boundaries.
    let processed = htmlContent
      .replace(/&nbsp;|&#160;|&#xa0;/g, ' ')
      .replace(/ /g, ' ')

    // Step 1 — normalize every form of [END TOGGLE] to a sentinel.
    // Brackets are optional (Quill can drop them mid-edit) and whitespace
    // between END and TOGGLE may be regular space or non-breaking space.
    // Order matters: replace the text first, then collapse any wrappers
    // that are now wrapping just the sentinel.
    processed = processed.replace(/\[?\s*END[\s ]+TOGGLE\s*\]?/gi, TOGGLE_END_SENTINEL)
    // Collapse <strong>SENTINEL</strong> or <b>SENTINEL</b>
    processed = processed.replace(
      new RegExp(`<(?:strong|b|em|i)[^>]*>\\s*${TOGGLE_END_SENTINEL}\\s*<\\/(?:strong|b|em|i)>`, 'gi'),
      TOGGLE_END_SENTINEL
    )
    // Collapse <p>SENTINEL</p> (with optional whitespace + nested empty inline tags)
    processed = processed.replace(
      new RegExp(`<p[^>]*>(?:\\s|<br[^>]*>|&nbsp;)*${TOGGLE_END_SENTINEL}(?:\\s|<br[^>]*>|&nbsp;)*<\\/p>`, 'gi'),
      TOGGLE_END_SENTINEL
    )

    // Step 2 — wrap each TOGGLE block, terminating at the sentinel or the
    // next TOGGLE start, or end of string.
    processed = processed.replace(
      new RegExp(
        `<p[^>]*><strong[^>]*>\\[TOGGLE\\]\\s*([^<]+)<\\/strong><\\/p>([\\s\\S]*?)(?:${TOGGLE_END_SENTINEL}|(?=<p[^>]*><strong[^>]*>\\[TOGGLE\\])|$)`,
        'gi'
      ),
      (match, title, content) => {
        const cleanTitle = title.replace(/&nbsp;|&#160;|&#xa0;/g, ' ').trim()
        const cleanContent = (content || '')
          .replace(/&nbsp;|&#160;|&#xa0;/g, ' ')
          .replace(/\u00A0/g, ' ')
          .trim()
        return `<details class="post-toggle-details">
          <summary class="post-toggle-summary">${cleanTitle}</summary>
          <div class="post-toggle-content">${cleanContent}</div>
        </details>`
      }
    )

    // Step 3 — drop any leftover sentinels (END TOGGLE markers without a
    // matching TOGGLE start get removed entirely).
    processed = processed.split(TOGGLE_END_SENTINEL).join('')

    return processed
  }

  const handleEditPost = () => {
    if (!postId) return
    playButtonSound()
    const editData = {
      id: postId,
      title: postTitle,
      description: postDescription,
      content: postContent,
      category: postCategory,
      image_url: postImage,
      enclosure: postImage,
    }
    localStorage.setItem('cms-edit-post', JSON.stringify(editData))
    router.push(`/admin/cms?edit=${postId}`)
  }

  const handlePublishToInkHouse = async () => {
    if (!postId || !adminToken) return

    setIsPublishingToInkHouse(true)
    setInkHouseMessage(null)

    try {
      const response = await fetch('/api/admin/inkhouse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          postId,
          title: postTitle,
          content: postContent,
          description: '',
          category: postCategory,
          status: 'published',
          image_url: postImage || ''
        })
      })

      const data = await response.json()

      if (response.ok) {
        setInkHousePublished(true)
        setInkHouseMessage('Published to InkHouse!')
        setTimeout(() => setInkHouseMessage(null), 3000)
      } else {
        setInkHouseMessage(`Failed: ${data.error || 'Unknown error'}`)
        setTimeout(() => setInkHouseMessage(null), 5000)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error'
      setInkHouseMessage(`Failed: ${errorMessage}`)
      setTimeout(() => setInkHouseMessage(null), 5000)
    } finally {
      setIsPublishingToInkHouse(false)
    }
  }

  const handleSendNewsletter = async () => {
    if (!postId || !adminToken) return
    // Manual confirm: irreversible, hits all active subscribers.
    const confirmed = typeof window === 'undefined' ? true : window.confirm(
      'Send this entry as a newsletter to all active subscribers? This cannot be undone.'
    )
    if (!confirmed) return

    setIsSendingNewsletter(true)
    setNewsletterMessage(null)

    try {
      const response = await fetch('/api/admin/send-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ postId }),
      })
      const data = await response.json()
      if (response.ok) {
        setNewsletterMessage(
          `Sent to ${data.sent}/${data.attempted} subscribers${data.failed ? ` (${data.failed} failed)` : ''}`
        )
        setTimeout(() => setNewsletterMessage(null), 6000)
      } else {
        setNewsletterMessage(`Failed: ${data.error || 'Unknown error'}`)
        setTimeout(() => setNewsletterMessage(null), 6000)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error'
      setNewsletterMessage(`Failed: ${message}`)
      setTimeout(() => setNewsletterMessage(null), 6000)
    } finally {
      setIsSendingNewsletter(false)
    }
  }

  // SUPPLEMENTAL = post edited >24h after publish. Mirrors Picard's
  // "Captain's log, supplemental..." for log addendums.
  const pubMs = postDate ? new Date(postDate).getTime() : 0
  const updMs = postUpdatedAt ? new Date(postUpdatedAt).getTime() : 0
  const isSupplemental = pubMs > 0 && updMs > 0 && updMs - pubMs > 86_400_000
  const logCode = postId ? `LOG·${String(postId).padStart(3, '0')}` : ''

  const readButton = (where: 'top' | 'bottom') => (
    <button
      type="button"
      className={`rv-btn rv-readBtn rv-readBtn-${where}${isLiked ? ' on' : ''}`}
      aria-pressed={isLiked}
      onClick={() => {
        playButtonSound()
        handleLikeToggle()
      }}
    >
      <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3.5 8.5l3 3 6-7" />
      </svg>
      {isLiked ? 'Read' : 'Mark as read'}
    </button>
  )

  return (
    <div className={`rv rv-post${isJournal ? ' journal-post' : ''}`}>
      <AckToast message={ack} onDismiss={() => setAck(null)} />
      {lightbox && (
        <div
          className="rv-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.alt || 'Image preview'}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="rv-ibtn rv-lightboxClose"
            aria-label="Close image"
            data-tip="Close (Esc)"
            onClick={() => setLightbox(null)}
          >
            &times;
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox.src} alt={lightbox.alt} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
      {loading ? (
        <div className="rv-postWrap"><div className="rv-loader" aria-label="Loading"><span /></div></div>
      ) : (
        <div className="rv-postWrap">
          {/* Reading column: ~820px measure; top bar, title, text and pictures all share its edges. */}
          <div className="rv-readCol">
          {/* One slim row: back/home + LOG code … admin + sound/theme */}
          <div className="rv-postTop">
            <div className="rv-grp">
              <button type="button" className="rv-ibtn" onClick={handleGoBack} data-tip="Back" aria-label="Go back">
                <IoIosArrowBack size={16} />
              </button>
              <button type="button" className="rv-ibtn" onClick={handleGoHome} data-tip="Home" aria-label="Go to home">
                <Home size={15} />
              </button>
              {postId && (
                <span className="rv-label rv-kicker">
                  <Decoded text={logCode} />
                  {postCategory && <> &middot; <b>{postCategory}</b></>}
                  {isSupplemental && <span className="rv-supplemental"> &middot; Supplemental</span>}
                </span>
              )}
            </div>
            <div className="rv-grp">
              {isAdmin && adminMounted && (
                <div className="rv-grp rv-adminGrp">
                  <button onClick={handleEditPost} disabled={!postId} className="rv-btn">Edit</button>
                  {inkHousePublished ? (
                    <span className="rv-btn on rv-static">Published to InkHouse</span>
                  ) : (
                    <button onClick={handlePublishToInkHouse} disabled={isPublishingToInkHouse || !postId} className="rv-btn">
                      {isPublishingToInkHouse ? 'Publishing...' : 'Publish to InkHouse'}
                    </button>
                  )}
                  <button
                    onClick={handleSendNewsletter}
                    disabled={isSendingNewsletter || !postId}
                    className="rv-btn"
                    data-tip="Send to all active subscribers"
                  >
                    {isSendingNewsletter ? 'Sending...' : 'Email subscribers'}
                  </button>
                </div>
              )}
              <SoundToggle />
              <ThemeToggle />
            </div>
          </div>
          {(inkHouseMessage || newsletterMessage) && isAdmin && adminMounted && (
            <div className="rv-adminMsgs">
              {inkHouseMessage && <span className={`rv-msg ${inkHouseMessage.startsWith('Failed') ? 'error' : ''}`}>{inkHouseMessage}</span>}
              {newsletterMessage && <span className={`rv-msg ${newsletterMessage.startsWith('Failed') ? 'error' : ''}`}>{newsletterMessage}</span>}
            </div>
          )}

          <h1 className="rv-postTitle">{parse(postTitle)}</h1>
          <div className="rv-postSub">
            <span>Hari · {formatDate(postDate)}</span>
            {postCategory && (
              <>
                <span aria-hidden="true">·</span>
                <Link className="rv-link" href={`/?category=${encodeURIComponent(postCategory)}`}>{postCategory}</Link>
              </>
            )}
            {readButton('top')}
          </div>
          {isJournal && <hr className="hr-journal" />}
          <hr className="rv-titleRule" />

          <article className="post-content rv-content" onClick={handleContentClick}>
            {parse(processToggleBlocks(postContent), {
              replace: (domNode: unknown) => {
                const node = domNode as { attribs?: { style?: string } }
                if (node.attribs && node.attribs.style) {
                  delete node.attribs.style
                }
              }
            })}
          </article>

          <div className="rv-bottomRead">{readButton('bottom')}</div>

          {(adjacent?.prev || adjacent?.next) && (
            <nav className="rv-adjacent" aria-label="Adjacent log entries">
              {adjacent?.prev ? (
                <Link href={`/post/${adjacent.prev.normalized_title}`} className="rv-adj">
                  <div className="rv-label">&larr; <Decoded text={`LOG·${String(adjacent.prev.id).padStart(3, '0')}`} /></div>
                  <div className="t">{adjacent.prev.title}</div>
                </Link>
              ) : <span />}
              {adjacent?.next ? (
                <Link href={`/post/${adjacent.next.normalized_title}`} className="rv-adj next">
                  <div className="rv-label"><Decoded text={`LOG·${String(adjacent.next.id).padStart(3, '0')}`} /> &rarr;</div>
                  <div className="t">{adjacent.next.title}</div>
                </Link>
              ) : <span />}
            </nav>
          )}

          <section className="rv-discussion" aria-label="Discussion">
            <div className="rv-discussionHead">
              <h2>Discussion</h2>
              <button
                type="button"
                className="rv-btn"
                aria-expanded={showComments}
                onClick={() => {
                  playButtonSound()
                  setShowComments(!showComments)
                }}
              >
                {showComments ? '▾ Hide comments' : '▸ Show comments'}
              </button>
            </div>
            {showComments && (
              <div className="rv-comments">
                <CommentsWidget pageSlug={`/${normalizeTitle(title || '')}`} />
              </div>
            )}
          </section>
          </div>
        </div>
      )}
    </div>
  )
}
