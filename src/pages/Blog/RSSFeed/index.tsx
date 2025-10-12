import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdHome } from 'react-icons/md';
import './RSSFeed.css';
import { useLikes } from '../../../contexts/LikesContext';
import { useSounds } from '../../../contexts/SoundContext';
import Subscribe from '../../Subscribe/Subscribe'; // Import the new Subscribe component
import 'react-quill/dist/quill.snow.css';
import RSSFeedButton from '../../../components/widgets/RSSFeedButton';
import ThemeToggle from '../../../components/common/ThemeToggle';
import SoundToggle from '../../../components/common/SoundToggle';
import ViewSwitcher, { ViewMode } from '../../../components/ViewSwitcher/ViewSwitcher';

const targetUrl = `${import.meta.env.VITE_API_BASE_URL}/posts`;

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
  const [filteredItems, setFilteredItems] = useState<FeedItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'mostLiked' | 'alphabetical'>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Load saved view mode from localStorage
    const saved = localStorage.getItem('blogViewMode');
    return (saved as ViewMode) || 'list';
  });
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const navigate = useNavigate();
  const { likesData, updateLikesData } = useLikes();
  const { playButtonSound, playHoverSound, playToggleSound, playNavigationSound } = useSounds();

  // Pagination states - now using backend pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
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
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const categoriesData = await response.json();
        setCategories(categoriesData);
      } catch (error) {
        console.warn('Could not fetch categories, using empty list:', error);
        setCategories([]);
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

  // Save view mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('blogViewMode', viewMode);
  }, [viewMode]);

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filter and sort items
  useEffect(() => {
    let items = [...feedItems];

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        items.sort((a, b) => new Date(b.pub_date).getTime() - new Date(a.pub_date).getTime());
        break;
      case 'oldest':
        items.sort((a, b) => new Date(a.pub_date).getTime() - new Date(b.pub_date).getTime());
        break;
      case 'mostLiked':
        items.sort((a, b) => {
          const aLikes = getLikesForPost(a.title) || 0;
          const bLikes = getLikesForPost(b.title) || 0;
          return Number(bLikes) - Number(aLikes);
        });
        break;
      case 'alphabetical':
        items.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    setFilteredItems(items);
  }, [feedItems, sortBy, likesData]);

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
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/update-likes`, {
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

  // Render functions for different view modes
  const renderListView = () => (
    <div className="view-list">
      {filteredItems.map((item, index) => (
        <div
          key={index}
          className="list-item"
          onClick={() => {
            playButtonSound();
            window.scrollTo(0, 0);
            navigate(`/post/${item.title.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-')}`, { state: item });
          }}
        >
          <div className="list-item-content">
            {item.enclosure && (
              <div className="list-item-image">
                <img src={item.enclosure} alt={item.title} />
              </div>
            )}
            <div className="list-item-text">
              <div className="list-item-header">
                <h2 className="list-item-title">
                  {item.title}
                </h2>
                {item.category && <span className="list-item-category">{item.category}</span>}
              </div>
              <p className="list-item-description">
                {item.description && item.description.length > 20 ? `${item.description.substring(0, 20)}...` : item.description || ''}
              </p>
              <div className="list-item-meta">
                <span className="list-item-date">{new Date(item.pub_date).toLocaleDateString()}</span>
                {likesData.length > 0 && (
                  <span onClick={(e) => { e.stopPropagation(); playButtonSound(); handleLikeToggle(item.title); }} className="favorite-icon">
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
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderGridView = () => (
    <div className="view-grid">
      {filteredItems.map((item, index) => (
        <div key={index} className="grid-card" onClick={() => {
          playButtonSound();
          window.scrollTo(0, 0);
          navigate(`/post/${item.title.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-')}`, { state: item });
        }}>
          {item.enclosure && (
            <div className="grid-card-image">
              <img src={item.enclosure} alt={item.title} />
            </div>
          )}
          <div className="grid-card-content">
            <h3 className="grid-card-title">{item.title}</h3>
            <p className="grid-card-description">{item.description || ''}</p>
            <div className="grid-card-meta">
              <span className="grid-card-date">{new Date(item.pub_date).toLocaleDateString()}</span>
              {likesData.length > 0 && (
                <span onClick={(e) => { e.stopPropagation(); playButtonSound(); handleLikeToggle(item.title); }} className="favorite-icon">
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
          </div>
        </div>
      ))}
    </div>
  );

  const renderCompactView = () => (
    <div className="view-compact">
      {filteredItems.map((item, index) => (
        <div key={index} className="compact-item" onClick={() => {
          playButtonSound();
          window.scrollTo(0, 0);
          navigate(`/post/${item.title.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-')}`, { state: item });
        }}>
          <span className="compact-date">
            {new Date(item.pub_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })}
          </span>
          <span className="compact-title">{item.title}</span>
          {!isMobile && item.category && <span className="compact-category">{item.category}</span>}
        </div>
      ))}
    </div>
  );

  const renderMagazineView = () => {
    const [featured, ...rest] = filteredItems;
    return (
      <div className="view-magazine">
        {featured && (
          <div className="magazine-featured" onClick={() => {
            playButtonSound();
            window.scrollTo(0, 0);
            navigate(`/post/${featured.title.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-')}`, { state: featured });
          }}>
            {featured.enclosure && (
              <div className="magazine-featured-image">
                <img src={featured.enclosure} alt={featured.title} />
              </div>
            )}
            <div className="magazine-featured-content">
              <h2 className="magazine-featured-title">{featured.title}</h2>
              <p className="magazine-featured-description">{featured.description || ''}</p>
              <div className="magazine-featured-meta">
                <span>{new Date(featured.pub_date).toLocaleDateString()}</span>
                {featured.category && <span className="magazine-featured-category">{featured.category}</span>}
              </div>
            </div>
          </div>
        )}
        <div className="magazine-secondary">
          {rest.map((item, index) => (
            <div key={index} className="magazine-item" onClick={() => {
              playButtonSound();
              window.scrollTo(0, 0);
              navigate(`/post/${item.title.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-')}`, { state: item });
            }}>
              {item.enclosure && (
                <img src={item.enclosure} alt={item.title} className="magazine-item-image" />
              )}
              <div className="magazine-item-content">
                <h3 className="magazine-item-title">{item.title}</h3>
                <span className="magazine-item-date">{new Date(item.pub_date).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'list':
        return renderListView();
      case 'grid':
        return renderGridView();
      case 'compact':
        return renderCompactView();
      case 'magazine':
        return renderMagazineView();
      default:
        return renderListView();
    }
  };

  return (
    <div className="rss-feed">
      <div className="blog-header">
        <div className="nav-home-container">
          <div className="desktop-view-switcher">
            <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />
          </div>
          <div className="mobile-view-switcher-inline">
            <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} hideMagazine={true} />
          </div>
        </div>

        <div className="header-controls">
          <div className="controls-group">
            <SoundToggle />
            <ThemeToggle />
            <Subscribe />
            <div className="rss-button-wrapper">
              <RSSFeedButton />
            </div>
          </div>
        </div>
      </div>

      <div className="rss-feed-layout">
        {/* Main Feed */}
        <div className="rss-feed-main">
          <div className="category-dropdown">
            <div className="filter-controls">
              <div className="filter-section">
                <label htmlFor="category">Category</label>
                <select id="category" value={selectedCategory} onChange={(e) => {
                  playToggleSound();
                  setSelectedCategory(e.target.value);
                }}>
                  <option value="">All</option>
                  {categories.map((category, index) => (
                    <option key={index} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pagination Controls */}
            {paginationInfo && paginationInfo.totalPosts > 0 && (
              <div className="pagination-controls-inline">
                <button
                  onClick={() => {
                    playButtonSound();
                    goToPreviousPage();
                  }}
                  disabled={!paginationInfo.hasPrev}
                  className="pagination-button"
                >
                  &laquo;
                </button>

                <span className="pagination-info">
                  {isMobile ? `${paginationInfo.page}/${paginationInfo.totalPages}` : `Page ${paginationInfo.page} of ${paginationInfo.totalPages}`}
                </span>

                <button
                  onClick={() => {
                    playButtonSound();
                    goToNextPage();
                  }}
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
              <div className={`feed-content view-mode-${viewMode}`}>
                {renderContent()}
              </div>

              {/* Mobile About & Stats - Only visible on mobile, at bottom */}
              <div className="mobile-widgets">
                {/* About Widget - Mobile */}
                <div className="mobile-widget mobile-about-widget">
                  <h3 className="mobile-widget-title">About</h3>
                  <p className="mobile-about-text">
                    I'm Haripriya, but most call me Hari. I write about life, tech, and things that matter. Sometimes it's code, sometimes it's reflections, but always something I care about.
                  </p>
                  <div className="mobile-about-links">
                    <a href="/personal-goals" onClick={(e) => { e.preventDefault(); playNavigationSound(); navigate('/personal-goals'); }}>
                      Personal Goals
                    </a>
                    <span className="mobile-link-separator">•</span>
                    <a href="https://apps.haripriya.org" target="_blank" rel="noopener noreferrer" onClick={playNavigationSound}>
                      My Apps
                    </a>
                  </div>
                </div>

                {/* Stats Widget - Mobile */}
                {paginationInfo && (
                  <div className="mobile-widget mobile-stats-widget">
                    <div className="mobile-stat-item">
                      <span className="mobile-stat-value">{paginationInfo.totalPosts}</span>
                      <span className="mobile-stat-label">Posts</span>
                    </div>
                    <div className="mobile-stat-separator"></div>
                    <div className="mobile-stat-item">
                      <span className="mobile-stat-value">{categories.length}</span>
                      <span className="mobile-stat-label">Categories</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="rss-feed-sidebar">
          {/* Categories Widget */}
          <div className="sidebar-widget">
            <h3 className="sidebar-widget-title">Categories</h3>
            <div className="sidebar-categories">
              <button
                className={`sidebar-category-btn ${selectedCategory === '' ? 'active' : ''}`}
                onClick={() => {
                  playButtonSound();
                  setSelectedCategory('');
                }}
              >
                All
              </button>
              {categories.map((category, index) => (
                <button
                  key={index}
                  className={`sidebar-category-btn ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => {
                    playButtonSound();
                    setSelectedCategory(category);
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* About/Bio Widget */}
          <div className="sidebar-widget">
            <h3 className="sidebar-widget-title">About</h3>
            <div className="sidebar-about">
              <p className="sidebar-about-text">
                I'm Haripriya, but most call me Hari. I write about life, tech, and things that matter. Sometimes it's code, sometimes it's reflections, but always something I care about.
              </p>
              <div className="sidebar-about-links">
                <a href="/personal-goals" onClick={(e) => { e.preventDefault(); playNavigationSound(); navigate('/personal-goals'); }}>
                  Personal Goals
                </a>
                <a href="https://apps.haripriya.org" target="_blank" rel="noopener noreferrer" onClick={playNavigationSound}>
                  My Apps
                </a>
              </div>
            </div>
          </div>

          {/* Blog Stats Widget */}
          {!loading && paginationInfo && (
            <div className="sidebar-widget">
              <h3 className="sidebar-widget-title">Stats</h3>
              <div className="sidebar-stats">
                <div className="sidebar-stat-item">
                  <span className="sidebar-stat-value">{paginationInfo.totalPosts}</span>
                  <span className="sidebar-stat-label">Posts</span>
                </div>
                <div className="sidebar-stat-item">
                  <span className="sidebar-stat-value">{categories.length}</span>
                  <span className="sidebar-stat-label">Categories</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default RSSFeed;