import Link from 'next/link'
import { Navbar } from '@/components/layout'
import './not-found.css'

export default function NotFound() {
  return (
    <>
      <Navbar />
      <div className="not-found-container">
        <div className="not-found-panel">
          <span className="not-found-code">ERR&middot;404</span>
          <h1 className="not-found-title">LOG NOT FOUND</h1>
          <p className="not-found-text">
            This entry has been redacted, archived, or never existed in the first place.
          </p>
          <p className="not-found-meta">
            If you arrived here via a link, the entry&apos;s slug may have changed.
          </p>
          <Link href="/" className="not-found-link">
            <span className="not-found-link-arrow">&larr;</span>
            <span>RETURN TO HOME</span>
          </Link>
        </div>
      </div>
    </>
  )
}
