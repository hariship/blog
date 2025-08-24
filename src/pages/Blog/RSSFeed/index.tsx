import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdHome } from 'react-icons/md';
import './RSSFeed.css';
import { useLikes } from '../../../contexts/LikesContext';
import Subscribe from '../../Subscribe/Subscribe'; // Import the new Subscribe component
import 'react-quill/dist/quill.snow.css';
import RSSFeedButton from '../../../components/widgets/RSSFeedButton';
import ThemeToggle from '../../../components/common/ThemeToggle';

const targetUrl = `${process.env.REACT_APP_API_BASE_URL}/rss-feed`;

interface FeedItem {
  title: string;
  category?: string;
  pubDate: string;
  [key: string]: any;
}

const RSSFeed: React.FC = () => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filteredFeedItems, setFilteredFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const { likesData, updateLikesData } = useLikes();
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage: number = 5;
  const [totalPages, setTotalPages] = useState<number>(0);

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
    const filtered = selectedCategory 
      ? feedItems.filter(item => item.category === selectedCategory) 
      : feedItems;
    
    setFilteredFeedItems(filtered);
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    setCurrentPage(1); // Reset to first page when filter changes
  }, [selectedCategory, feedItems, itemsPerPage]);

  const getLikesForPost = (title: string) => {
    const postLikesData = likesData.find(like => like.title === title);
    return postLikesData ? postLikesData.likesCount || '' : '';
  };

  const isPostLiked = (title: string) => {
    const postLikesData = likesData.find(like => like.title === title);
    return postLikesData ? postLikesData.isLiked : false;
  };

  const handleLikeToggle = async (title: string) => {
    const postLikesData = likesData.find(like => like.title === title);
    if (!postLikesData) return; // Exit if post data not found
    
    const isAlreadyLiked = postLikesData.isLiked;
    const newLikesCount = isAlreadyLiked ? postLikesData.likesCount - 1 : postLikesData.likesCount + 1;

    // Optimistic UI update: update the UI before the server response
    updateLikesData(title, newLikesCount, !isAlreadyLiked);

    try {
      // Make server request to update likes
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/update-likes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, likesCount: newLikesCount }),
      });

      if (!response.ok) {
        throw new Error('Failed to update likes');
      }
    } catch (error) {
      console.error('Failed to update likes in Redis:', error);
      // Revert UI in case of an error
      updateLikesData(title, postLikesData.likesCount, isAlreadyLiked);
    }
  };

  // Pagination handlers
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Get current page's items
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredFeedItems.slice(indexOfFirstItem, indexOfLastItem);

  // Generate page numbers
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="rss-feed">
    <div className="blog-header">
      <div className="nav-home-container">
        <a href="/" className="nav-home">
          <MdHome className="home-icon" size="3em" />
        </a>
      </div>
      
      <h1 className="rss-feed-title">Posts</h1>
      
      <div className="header-controls">
        <div className="controls-group">
          <ThemeToggle />
          <Subscribe />
          <div className="rss-button-wrapper">
            <RSSFeedButton />
          </div>
        </div>
      </div>
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
        <>
          <ul className="rss-feed-list">
            {currentItems.map((item, index) => (
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

                  {/* Show heart and likes count if post exists in likesData */}
                  {likesData.length > 0 && (
                    <span onClick={() => handleLikeToggle(item.title)} className="favorite-icon">
                      <svg
                        className={isPostLiked(item.title) ? 'liked' : 'not-liked'}
                        stroke="currentColor"
                        fill="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        height="1em"
                        width="1em"
                      >
                        <path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
                      </svg>
                      <span>{getLikesForPost(item.title)}</span>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Simplified Pagination Controls */}
          {filteredFeedItems.length > 0 && (
            <div className="pagination-controls">
              <button 
                onClick={goToPreviousPage} 
                disabled={currentPage === 1}
                className="pagination-button"
              >
                &laquo;
              </button>
              
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              
              <button 
                onClick={goToNextPage} 
                disabled={currentPage === totalPages}
                className="pagination-button"
              >
                &raquo;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};


export default RSSFeed;