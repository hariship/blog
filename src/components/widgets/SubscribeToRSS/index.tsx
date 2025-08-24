import React from 'react';
import './SubscribeToRSS.css';

const SubscribeToRSS: React.FC = () => {
  const rssFeedUrl: string = `${process.env.REACT_APP_API_BASE_URL}/rss-feed`;

  return (
    <div className="subscribe-rss-container">
      <h2>📡 Subscribe to Our RSS Feed</h2>
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
  );
};

export default SubscribeToRSS;
