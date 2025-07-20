import React from 'react';

export default function SubscribeToRSS() {
  const rssFeedUrl = 'https://api.haripriya.org/rss-feed';

  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h2>📡 Subscribe to Our RSS Feed</h2>
      <p>You can stay updated with the latest posts by subscribing to our RSS feed below:</p>
      <a
        href={rssFeedUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          marginTop: '20px',
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: '#4CAF50',
          color: 'white',
          borderRadius: '6px',
          textDecoration: 'none',
        }}
      >
        Subscribe to RSS
      </a>
    </div>
  );
}
