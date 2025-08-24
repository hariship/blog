import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdHome } from 'react-icons/md';
import './RSSFeed.css';
import { useLikes } from '../../../contexts/LikesContext';
import Subscribe from '../../Subscribe/Subscribe'; // Import the new Subscribe component
import 'react-quill/dist/quill.snow.css';
import RSSFeedButton from '../../../components/widgets/RSSFeedButton';

const targetUrl = `${process.env.REACT_APP_API_BASE_URL}/rss-feed`;

const RSSFeed = () => {
  const [feedItems, setFeedItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filteredFeedItems, setFilteredFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { likesData, updateLikesData } = useLikes();
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [totalPages, setTotalPages] = useState(0);

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

  const getLikesForPost = (title) => {
    const postLikesData = likesData.find(like => like.title === title);
    return postLikesData ? parseInt(postLikesData.likesCount, 10) || '' : '';
  };

  const isPostLiked = (title) => {
    const postLikesData = likesData.find(like => like.title === title);
    return postLikesData ? postLikesData.isLiked : false;
  };

  const handleLikeToggle = async (title) => {
    const postLikesData = likesData.find(like => like.title === title);
    const isAlreadyLiked = postLikesData && postLikesData.isLiked;
    let newLikesCount = isAlreadyLiked ? postLikesData.likesCount - 1 : postLikesData.likesCount + 1;

    // Ensure likesCount is an integer
    newLikesCount = parseInt(newLikesCount, 10);

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
        <a href={process.env.REACT_APP_BLOG_BASE_URL} className="nav-home">
          <MdHome color="#35495E" size="3em" />
        </a>
      </div>
      
      <h1 className="rss-feed-title">Posts</h1>
      
      <div className="subscribe-container-wrapper">
        <Subscribe />
      </div>
      <div style={{ textAlign: 'center', margin: '10px 0' }}>
        <RSSFeedButton />
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
                    <span onClick={() => handleLikeToggle(item.title)} className="favorite-icon" style={{ cursor: 'pointer' }}>
                      <svg
                        stroke="currentColor"
                        fill="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        height="1em"
                        width="1em"
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
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Simplified Pagination Controls */}
          {filteredFeedItems.length > 0 && (
            <div className="pagination-controls" style={{ marginTop: '20px', textAlign: 'center' }}>
              <button 
                onClick={goToPreviousPage} 
                disabled={currentPage === 1}
                className="pagination-button"
                style={{ 
                  padding: '8px 12px', 
                  margin: '0 5px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  backgroundColor: '#f8f8f8',
                  border: '1px solid #ddd',
                  borderRadius: '3px'
                }}
              >
                &laquo;
              </button>
              
              <span style={{ margin: '0 10px' }}>
                Page {currentPage} of {totalPages}
              </span>
              
              <button 
                onClick={goToNextPage} 
                disabled={currentPage === totalPages}
                className="pagination-button"
                style={{ 
                  padding: '8px 12px', 
                  margin: '0 5px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  backgroundColor: '#f8f8f8',
                  border: '1px solid #ddd',
                  borderRadius: '3px'
                }}
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