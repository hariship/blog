import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdHome } from 'react-icons/md';
import './RSSFeed.css';
import { useLikes } from '../../../contexts/LikesContext';
import Subscribe from '../../Subscribe/Subscribe'; // Import the new Subscribe component
import 'react-quill/dist/quill.snow.css';
import RSSFeedButton from '../../../components/widgets/RSSFeedButton';
import ThemeToggle from '../../../components/common/ThemeToggle';

const targetUrl = `${process.env.REACT_APP_API_BASE_URL}/posts`;

interface FeedItem {
  title: string;
  category?: string;
  pub_date: string;
  description: string;
  link: string;
  content: string;
  enclosure: string;
  normalized_title: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalPosts: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const RSSFeed: React.FC = () => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const { likesData, updateLikesData } = useLikes();
  
  // Pagination states - now using backend pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(5);
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo | null>(null);

  useEffect(() => {
    const fetchRSSFeed = async () => {
      setLoading(true);
      try {
        let url = `${targetUrl}?page=${currentPage}&limit=${itemsPerPage}`;
        if (selectedCategory) {
          url += `&category=${encodeURIComponent(selectedCategory)}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        setFeedItems(data.posts);
        setPaginationInfo(data.pagination);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching posts:', error);
        setLoading(false);
      }
    };
    fetchRSSFeed();
  }, [currentPage, itemsPerPage, selectedCategory]);

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/categories`);
        const categoriesData = await response.json();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Reset to page 1 when category filter changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [selectedCategory]);

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

  // Pagination handlers - now using backend pagination
  const goToNextPage = () => {
    if (paginationInfo?.hasNext) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (paginationInfo?.hasPrev) {
      setCurrentPage(currentPage - 1);
    }
  };

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
        <div className="filter-section">
          <label htmlFor="category">Category</label>
          <select id="category" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">All</option>
            {categories.map((category, index) => (
              <option key={index} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        
        {/* Pagination Controls */}
        {paginationInfo && paginationInfo.totalPosts > 0 && (
          <div className="pagination-controls-inline">
            <button 
              onClick={goToPreviousPage} 
              disabled={!paginationInfo.hasPrev}
              className="pagination-button"
            >
              &laquo;
            </button>
            
            <span className="pagination-info">
              Page {paginationInfo.page} of {paginationInfo.totalPages}
            </span>
            
            <button 
              onClick={goToNextPage} 
              disabled={!paginationInfo.hasNext}
              className="pagination-button"
            >
              &raquo;
            </button>
          </div>
        )}
      </div>
      {loading ? (
        <div className="loader"></div>
      ) : (
        <>
          <ul className="rss-feed-list">
            {feedItems.map((item, index) => (
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
                  <p className="rss-feed-item-date">Date: {new Date(item.pub_date).toLocaleDateString()}</p>

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
        </>
      )}
    </div>
  );
};


export default RSSFeed;