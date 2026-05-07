'use client'

import Link from 'next/link'
import parse from 'html-react-parser'
import { IoIosArrowBack } from 'react-icons/io'
import { Navbar } from '@/components/layout'
import { ThemeToggle, SoundToggle } from '@/components/common'
import '../post/[title]/Post.css'
import './now.css'

interface NowClientProps {
  post: { title: string; content: string; pub_date: string } | null
}

const formatDate = (dateString: string): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `Last updated ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

export default function NowClient({ post }: NowClientProps) {
  return (
    <>
      <Navbar />
      <div className="post-container now-container">
        <div className="post-header">
          <Link href="/" className="back-button" aria-label="Back to home">
            <IoIosArrowBack className="back-icon" />
          </Link>
          <div className="post-theme-toggle">
            <SoundToggle />
            <ThemeToggle />
          </div>
        </div>

        {post ? (
          <>
            <h1 className="post-title">{post.title || 'Now'}</h1>
            {post.pub_date && (
              <div className="post-meta now-meta">
                <span className="post-date">{formatDate(post.pub_date)}</span>
              </div>
            )}
            <div className="post-content now-content">
              {parse(post.content || '')}
            </div>
          </>
        ) : (
          <>
            <h1 className="post-title">Now</h1>
            <div className="post-content now-content">
              <p>Nothing here yet.</p>
            </div>
          </>
        )}
      </div>
    </>
  )
}
