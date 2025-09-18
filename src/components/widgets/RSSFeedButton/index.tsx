import React from 'react';
import './RSSFeedButton.css';

const RSSFeedButton: React.FC = () => {
  const rssFeedUrl: string = `${import.meta.env.VITE_API_BASE_URL}/blog-feed.xml`;

  return (
    <a
      href={rssFeedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="rss-feed-icon-button"
      title="RSS Feed"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="rss-feed-icon"
      >
        <circle cx="6.18" cy="17.82" r="2.18" />
        <path d="M4 4v4c7.72 0 14 6.28 14 14h4C22 10.07 13.93 2 4 2v2zm0 6v4c3.31 0 6 2.69 6 6h4c0-5.52-4.48-10-10-10z"/>
      </svg>
    </a>
  );
};

export default RSSFeedButton;
