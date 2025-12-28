'use client'

import './SubscribeToRSS.css'

const SubscribeToRSS = () => {
  const rssFeedUrl = '/api/blog-feed.xml'

  return (
    <div className="subscribe-rss-container">
      <h2>Subscribe to Our RSS Feed</h2>
      <p>You can stay updated with the latest posts by subscribing to our RSS feed below:</p>
      <a
        href={rssFeedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rss-subscribe-button"
      >
        Subscribe to RSS
      </a>
    </div>
  )
}

export default SubscribeToRSS
