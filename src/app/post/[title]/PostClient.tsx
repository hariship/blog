'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import parse from 'html-react-parser'
import { IoIosArrowBack } from 'react-icons/io'
import { useLikes } from '@/contexts/LikesContext'
import { useSounds } from '@/contexts/SoundContext'
import { CommentsWidget } from '@/components/widgets'
import { ThemeToggle, SoundToggle } from '@/components/common'
import type { PostData } from './page'
import './Post.css'

interface PostClientProps {
  title: string
  initialPost?: PostData | null
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

export default function PostClient({ title, initialPost }: PostClientProps) {
  const [postContent, setPostContent] = useState<string>(initialPost?.content || '')
  const [postTitle, setPostTitle] = useState<string>(initialPost?.title || '')
  const [postDate, setPostDate] = useState<string>(initialPost?.pub_date || '')
  const [postCategory, setPostCategory] = useState<string>(initialPost?.category || '')
  const [postImage, setPostImage] = useState<string>(initialPost?.enclosure || '')
  const { likesData, updateLikesData } = useLikes()
  const [likesCount, setLikesCount] = useState<number>(initialPost?.likesCount || 0)
  const [isLiked, setIsLiked] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(!initialPost)
  const [showComments, setShowComments] = useState<boolean>(false)

  const router = useRouter()
  const { playButtonSound } = useSounds()
  const normalized = normalizeTitle(title || '')
  const isJournal = normalized === 'life-lately-20-2025'

  const getReadStatusFromStorage = (postTitle: string): boolean => {
    try {
      const stored = localStorage.getItem('readPosts')
      if (stored) {
        const readPosts = JSON.parse(stored)
        return readPosts.includes(postTitle)
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

        const isReadInStorage = getReadStatusFromStorage(title)
        const postLikesData = likesData.find(like => like.title === title)
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
      setLikesCount(initialPost.likesCount || 0)
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
    if (postTitle && likesData.length > 0) {
      const postLikesData = likesData.find(like => like.title === postTitle)
      if (postLikesData) {
        setIsLiked(postLikesData.isLiked)
        setLikesCount(postLikesData.likesCount)
      }
    }
  }, [likesData, postTitle])

  // Update page title
  useEffect(() => {
    if (postTitle) {
      document.title = postTitle
    }
  }, [postTitle])

  const handleGoBack = () => {
    playButtonSound()
    router.push('/')
  }

  const handleLikeToggle = async () => {
    const previousIsLiked = isLiked
    const previousLikesCount = likesCount
    const newIsLiked = !isLiked
    const updatedLikesCount = newIsLiked ? likesCount + 1 : likesCount - 1

    updateLikesData(postTitle, updatedLikesCount, newIsLiked)
    setIsLiked(newIsLiked)
    setLikesCount(updatedLikesCount)

    try {
      const response = await fetch('/api/update-likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: postTitle, likesCount: updatedLikesCount }),
      })

      if (!response.ok) {
        throw new Error('Failed to update likes')
      }
    } catch (error) {
      console.error('Failed to update likes:', error)
      updateLikesData(postTitle, previousLikesCount, previousIsLiked)
      setIsLiked(previousIsLiked)
      setLikesCount(previousLikesCount)
    }
  }

  const processToggleBlocks = (htmlContent: string): string => {
    if (!htmlContent) return htmlContent

    // Replace non-breaking spaces with regular spaces for proper word wrapping
    let processed = htmlContent.replace(/&nbsp;/g, ' ')

    processed = processed.replace(
      /<p><strong[^>]*>\[TOGGLE\]\s*([^<]+)<\/strong><\/p>([\s\S]*?)(?:<strong[^>]*>\[END TOGGLE\]<\/strong>|(?=<p><strong[^>]*>\[TOGGLE\])|$)/gi,
      (match, title, content) => {
        let cleanContent = content.trim() || ''
        cleanContent = cleanContent.replace(/<strong[^>]*>\[END TOGGLE\]<\/strong>/gi, '')

        return `<details class="post-toggle-details">
          <summary class="post-toggle-summary">${title.trim()}</summary>
          <div class="post-toggle-content">${cleanContent}</div>
        </details>`
      }
    )

    processed = processed.replace(/<strong[^>]*>\[END TOGGLE\]<\/strong>/gi, '')

    return processed
  }

  return (
    <div className={`post-container ${isJournal ? 'journal-post' : ''}`}>
      {loading ? (
        <div className="loader"></div>
      ) : (
        <>
          <div className="post-header">
            <div className="back-button" onClick={handleGoBack}>
              <IoIosArrowBack className="back-icon" />
            </div>
            <div className="post-theme-toggle">
              <SoundToggle />
              <ThemeToggle />
            </div>
          </div>
          <h1 className="post-title">{parse(postTitle)}</h1>
          <div className="post-meta">
            <span className="author-name">Hari</span> &bull;
            <span className="post-date">
              &nbsp;{formatDate(postDate)} &bull;
            </span>
            <span className="post-category">&nbsp;{postCategory}</span>
            {isJournal && <hr className="hr-journal" />}
          </div>
          <div className="post-content">
            {parse(processToggleBlocks(postContent), {
              replace: (domNode: unknown) => {
                const node = domNode as { attribs?: { style?: string } }
                if (node.attribs && node.attribs.style) {
                  delete node.attribs.style
                }
              }
            })}
          </div>

          <span
            className="like-button read-button"
            onClick={() => {
              playButtonSound()
              handleLikeToggle()
            }}
            style={{ display: 'none' }}
          >
            {likesCount !== null && (
              isLiked ? (
                <svg
                  className="heart-icon liked"
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 16 16"
                  height="1.2em"
                  width="1.2em"
                >
                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                </svg>
              ) : (
                <svg
                  className="heart-icon not-liked"
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 16 16"
                  height="1.2em"
                  width="1.2em"
                >
                  <path d="M4 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm2.625.547a3 3 0 0 0-5.584.953H.5a.5.5 0 0 0 0 1h.541A3 3 0 0 0 7 8a1 1 0 0 1 2 0 3 3 0 0 0 5.959.5h.541a.5.5 0 0 0 0-1h-.541a3 3 0 0 0-5.584-.953A1.993 1.993 0 0 0 8 6c-.532 0-1.016.208-1.375.547zM14 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
                </svg>
              )
            )}
          </span>
          <br/>
          <br/>
          <hr/>
          <div className="comments-section">
            <button
              className="comments-toggle"
              onClick={() => {
                playButtonSound()
                setShowComments(!showComments)
              }}
            >
              <div className="comments-toggle-icon">
                {showComments ? '▼' : '▶'}
              </div>
              <span className="comments-toggle-text">
                Comments
              </span>
            </button>
            {showComments && (
              <div className="comments-widget-container">
                <CommentsWidget pageSlug={`/${normalizeTitle(title || '')}`} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
