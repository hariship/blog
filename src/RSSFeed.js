import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdHome } from 'react-icons/md';
import './RSSFeed.css';
import { useLikes } from './likesContext';

const targetUrl = 'https://api.haripriya.org/rss-feed';

const RSSFeed = () => {
  const [feedItems, setFeedItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filteredFeedItems, setFilteredFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { likesData, updateLikesData } = useLikes();

  useEffect(() => {
    const fetchRSSFeed = async () => {
      setLoading(true);
      try {
        const response = await fetch(targetUrl);
        const data = await response.json();
        setFeedItems(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching posts:', error);
        setLoading(false);
      }
    };
    fetchRSSFeed();
  }, []);

  useEffect(() => {
    setFilteredFeedItems(selectedCategory ? feedItems.filter(item => item.category === selectedCategory) : feedItems);
  }, [selectedCategory, feedItems]);

  const getLikesForPost = (title) => {
    const postLikesData = likesData.find(like => like.title === title);
    return postLikesData ? postLikesData.likesCount : 0;
  };

  const isPostLiked = (title) => {
    const postLikesData = likesData.find(like => like.title === title);
    return postLikesData ? postLikesData.isLiked : false;
  };

  const handleLikeToggle = async (title) => {
    const postLikesData = likesData.find(like => like.title === title);
    const isAlreadyLiked = postLikesData && postLikesData.isLiked;
    const newLikesCount = isAlreadyLiked ? postLikesData.likesCount - 1 : postLikesData.likesCount + 1;
  
    // Optimistic UI update
    updateLikesData(title, newLikesCount, !isAlreadyLiked);
  
    try {
      // Update the likes on the backend
      const response = await fetch('https://api.haripriya.org/update-likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, likesCount: newLikesCount }),
      });
      if (!response.ok) throw new Error('Failed to update likes');
    } catch (error) {
      console.error('Failed to update likes in Redis:', error);
  
      // Revert UI if there's an error
      updateLikesData(title, postLikesData.likesCount, isAlreadyLiked);
    }
  };

  return (
    <div className="rss-feed">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: '#fff' }}>
        <nav className="rss-nav">
          <a href="https://haripriya.org" className="nav-home">
            <MdHome color="#35495E" size="3em" />
          </a>
        </nav>
        <h1 className="rss-feed-title">Posts</h1>
        <div style={{ width: '50px' }}></div>
      </div>
      <div className="category-dropdown">
        <label htmlFor="category">Category</label>
        <select id="category" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option value="">All</option>
          {[...new Set(feedItems.map((item) => item.category))].map((category, index) => (
            <option key={index} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="loader"></div>
      ) : (
        <ul className="rss-feed-list">
          {filteredFeedItems.map((item, index) => (
            <li key={index} className="rss-feed-item">
              <div className="rss-feed-item-image">
                {item.enclosure && (
                  <img
                    src={item.enclosure}
                    alt="Enclosure"
                    className="enclosure-image"
                    onClick={() => navigate(`/post/${item.title.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-')}`, { state: item })}
                  />
                )}
              </div>
              <div className="rss-feed-item-content">
                <h2 className="rss-feed-item-title" onClick={() => navigate(`/post/${item.title.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-')}`, { state: item })}>
                  {item.title}
                </h2>
                <p className="rss-feed-item-description">{item.description}</p>
                <p className="rss-feed-item-date">Date: {new Date(item.pubDate).toLocaleDateString()}</p>
                <span onClick={() => handleLikeToggle(item.title)} className="favorite-icon">
                  <svg
                    stroke="currentColor"
                    fill="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    color="black"
                    height="1em"
                    width="1em"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      color: 'black',
                      fill: isPostLiked(item.title) ? 'red' : 'none',
                      stroke: isPostLiked(item.title) ? 'none' : 'red',
                    }}
                  >
                    <path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
                  </svg>
                  &nbsp;{getLikesForPost(item.title)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RSSFeed;