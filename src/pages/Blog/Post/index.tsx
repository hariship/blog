import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import parse, { domToReact } from 'html-react-parser';
import './Post.css';
import { useLikes } from '../../../contexts/LikesContext';
import { useSounds } from '../../../contexts/SoundContext';
import { IoIosArrowBack } from 'react-icons/io';
import { Helmet } from 'react-helmet';
import CommentsWidget from "../../../components/widgets/CommentsWidget";
import ThemeToggle from '../../../components/common/ThemeToggle';
import SoundToggle from '../../../components/common/SoundToggle';

// Import our local content
import htmlContents from '../../../data/html-content';

// Function to normalize the title (similar to server-side logic)
const normalizeTitle = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s\-]/g, '')   // Remove special characters
    .replace(/\s+/g, '-')        // Replace spaces with hyphens
    .replace(/-+/g, '-');        // Replace multiple hyphens with a single hyphen
};

const formatDate = (dateString: string): string => {
  try {
    // If it's already in the right format, return it as is
    if (typeof dateString === 'string' && dateString.match(/^[A-Za-z]{3}\s\d{1,2}$/)) {
      return dateString;
    }
    
    // Otherwise, try to parse and format it
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // If parsing fails, return original or default
      return dateString || 'Mar 30';
    }
    
    // Format as "Mar 23"
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${month} ${day} ${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

const Post: React.FC = () => {
  const [postContent, setPostContent] = useState<string>('');
  const [postTitle, setPostTitle] = useState<string>('');
  const [postDate, setPostDate] = useState<string>('');
  const [postCategory, setPostCategory] = useState<string>('');
  const [postImage, setPostImage] = useState<string>('');
  const { likesData, updateLikesData } = useLikes();
  const [likesCount, setLikesCount] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showComments, setShowComments] = useState<boolean>(false);
  const navigate = useNavigate();
  const { playButtonSound } = useSounds();
  const { title } = useParams<{ title: string }>(); // Get title from URL params
  const normalized = normalizeTitle(title || ''); // Normalize title
  const isJournal = normalized === 'life-lately-20-2025';

  // Load read status from localStorage
  const getReadStatusFromStorage = (postTitle: string): boolean => {
    try {
      const stored = localStorage.getItem('readPosts');
      if (stored) {
        const readPosts = JSON.parse(stored);
        return readPosts.includes(postTitle);
      }
      return false;
    } catch (error) {
      console.error('Error loading read status from localStorage:', error);
      return false;
    }
  };

  // Fetch post content by title
  const fetchPostContent = async (postTitleFromURL: string) => {
    const normalizedTitle = normalizeTitle(postTitleFromURL); // Normalize title

    const targetUrl = `${import.meta.env.VITE_API_BASE_URL}/post/${normalizedTitle}`;
    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error('Post not found');
      }

      const post = await response.json();

      console.log('=== API Response Debug ===');
      console.log('Full post object:', post);
      console.log('Enclosure field:', post.enclosure);
      console.log('Image URL field:', post.imageUrl);

      if (post) {
        const { content, title, pubDate, category, enclosure, description } = post;
        setPostTitle(title);
        setPostDate(pubDate);
        setPostCategory(category);
        setPostContent(content || 'No content available');
        setPostImage(enclosure || '');
        setDescription(description);

        // Check if content is actually available - if not, load from local file
        if (content === 'No content available' || !content) {
          console.log('No content from API, loading local content');
          loadLocalContent(normalizedTitle);
        }

        // First check localStorage for read status
        const isReadInStorage = getReadStatusFromStorage(title);

        // Then check context
        const postLikesData = likesData.find(like => like.title === title);
        if (postLikesData) {
          setLikesCount(postLikesData.likesCount);
          setIsLiked(postLikesData.isLiked);
        } else {
          setLikesCount(0);
          // Use localStorage value if context doesn't have it yet
          setIsLiked(isReadInStorage);
        }
      } else {
        console.error('Post not found');
        loadLocalContent(normalizedTitle);
      }
    } catch (error) {
      console.error('Error fetching post content:', error);
      loadLocalContent(normalizedTitle);
    } finally {
      setLoading(false);
    }
  };

  // Check if content exists locally
  const checkLocalContent = (normalizedTitle: string) => {
    // Convert dashes to underscores for JavaScript variable naming
    const contentKey = normalizedTitle.replace(/-/g, '_');
    return (htmlContents as any)[contentKey] !== undefined;
  };

  // Load content from local files
  // Add these debug lines to your loadLocalContent function:

  const loadLocalContent = (normalizedTitle: string) => {
    try {
      // Convert dashes to underscores for JavaScript variable naming
      const contentKey = normalizedTitle.replace(/-/g, '_');
      
      console.log("Looking for content with key:", contentKey);
      console.log("Available content keys:", Object.keys(htmlContents));
      
      if ((htmlContents as any)[contentKey]) {
        console.log("Content found? Yes");
        console.log("Content length:", (htmlContents as any)[contentKey].length);
        console.log("Content preview:", (htmlContents as any)[contentKey].substring(0, 100));
        
        // Try updating both the state and directly modifying the DOM
        setPostContent((htmlContents as any)[contentKey]);
        
        // Try direct DOM manipulation as a fallback
        setTimeout(() => {
          const contentDiv = document.querySelector('.post-content');
          if (contentDiv && contentDiv.innerHTML.includes('No content available')) {
            console.log("Directly updating DOM as fallback");
            contentDiv.innerHTML = htmlContents[contentKey];
          }
        }, 500);
        
        console.log("No content from API, loading local content");
      } else {
        console.error("Content not found for key:", contentKey);
      }
    } catch (error) {
      console.error('Error loading local content:', error);
    }
  };

  useEffect(() => {
    // Fetch from server using title in the URL
    if (title) {
      fetchPostContent(title);
    }
  }, [title]);

  // Separate useEffect to sync isLiked state with likesData context
  useEffect(() => {
    if (postTitle && likesData.length > 0) {
      const postLikesData = likesData.find(like => like.title === postTitle);
      if (postLikesData) {
        setIsLiked(postLikesData.isLiked);
        setLikesCount(postLikesData.likesCount);
      }
    }
  }, [likesData, postTitle]);

  const handleGoBack = () => {
    playButtonSound();
    navigate('/');
  };

  const handleLikeToggle = async () => {
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;
    const newIsLiked = !isLiked;
    // Calculate new likes count
    const updatedLikesCount = newIsLiked ? likesCount + 1 : likesCount - 1;

    // Optimistic update
    updateLikesData(postTitle, updatedLikesCount, newIsLiked);
    setIsLiked(newIsLiked);
    setLikesCount(updatedLikesCount);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/update-likes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: postTitle, likesCount: updatedLikesCount }),
      });

      if (!response.ok) {
        throw new Error('Failed to update likes');
      }
    } catch (error) {
      console.error('Failed to update likes:', error);

      // Revert the UI changes if the server request fails
      updateLikesData(postTitle, previousLikesCount, previousIsLiked);
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
    }
  };

  // Generate proper absolute URL for social media preview images (WhatsApp, Slack, Instagram)
  const getAbsoluteImageUrl = (imageUrl: string): string => {
    if (!imageUrl || imageUrl.trim() === '') {
      return 'https://blog.haripriya.org/logo192.png';
    }

    // If already an absolute URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // Handle relative URLs - ensure single slash
    const cleanPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `https://blog.haripriya.org${cleanPath}`;
  };

  const ogImageUrl = getAbsoluteImageUrl(postImage);

  // Debug logging for image URL
  React.useEffect(() => {
    console.log('=== Image URL Debug ===');
    console.log('Post Image (raw):', postImage);
    console.log('Post Image empty?:', !postImage || postImage.trim() === '');
    console.log('Generated OG Image URL:', ogImageUrl);
    console.log('Is fallback logo?:', ogImageUrl === 'https://blog.haripriya.org/logo192.png');
  }, [ogImageUrl, postImage]);

  // Process content to convert [TOGGLE] markers into <details> elements
  const processToggleBlocks = (htmlContent: string): string => {
    if (!htmlContent) return htmlContent;

    let processed = htmlContent;

    // Match toggle markers and capture content until [END TOGGLE]
    processed = processed.replace(
      /<p><strong[^>]*>\[TOGGLE\]\s*([^<]+)<\/strong><\/p>([\s\S]*?)(?:<strong[^>]*>\[END TOGGLE\]<\/strong>|(?=<p><strong[^>]*>\[TOGGLE\])|$)/gi,
      (match, title, content) => {
        let cleanContent = content.trim() || '';
        // Remove any [END TOGGLE] markers from content
        cleanContent = cleanContent.replace(/<strong[^>]*>\[END TOGGLE\]<\/strong>/gi, '');

        return `<details class="post-toggle-details">
          <summary class="post-toggle-summary">${title.trim()}</summary>
          <div class="post-toggle-content">${cleanContent}</div>
        </details>`;
      }
    );

    // Remove any remaining standalone [END TOGGLE] markers
    processed = processed.replace(/<strong[^>]*>\[END TOGGLE\]<\/strong>/gi, '');

    return processed;
  };

  return (
    <div className={`post-container ${isJournal ? 'journal-post' : ''}`}>
      <Helmet>
        <title>{postTitle || 'Blog Post'}</title>
        <meta property="og:url" content={`https://blog.haripriya.org/post/${normalized}`} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={postTitle || 'Blog Post'} />
        <meta property="og:description" content={description || 'Read this blog post by Hari'} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:secure_url" content={ogImageUrl} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:alt" content={postTitle || 'Blog post preview'} />
        <meta property="og:site_name" content="Hari's Blog" />
        <meta property="article:author" content="Hari" />

        {/* Twitter/WhatsApp specific tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={ogImageUrl} />
      </Helmet>
      {loading ? (
        <div className="loader"></div>
      ) : (
          <>
          <div className="post-header">
            <div className="back-button" onClick={handleGoBack}>
              {/* @ts-ignore */}
              <IoIosArrowBack className="back-icon" />
            </div>
            <div className="post-theme-toggle">
              <SoundToggle />
              <ThemeToggle />
            </div>
          </div>
          <h1 className="post-title">{parse(postTitle)}</h1>
          <div className="post-meta">
            <span className="author-name">Hari</span> &bull;
            <span className="post-date">
              &nbsp;{formatDate(postDate)} &bull;
            </span>
            <span className="post-category">&nbsp;{postCategory}</span>
            {isJournal && <hr className="hr-journal" />}
          </div>
          <div className="post-content">
                {
                    parse(processToggleBlocks(postContent), {
                    replace: (domNode: any) => {
                        if (domNode.attribs && domNode.attribs.style) {
                        delete domNode.attribs.style;
                        }
                    }
                    })
                }
        </div>

          <span className="like-button read-button" onClick={() => {
            playButtonSound();
            handleLikeToggle();
          }}>
            {likesCount !== null && (
              isLiked ? (
                <svg
                  className="heart-icon liked"
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 16 16"
                  height="1.2em"
                  width="1.2em"
                >
                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                </svg>
              ) : (
                <svg
                  className="heart-icon not-liked"
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 16 16"
                  height="1.2em"
                  width="1.2em"
                >
                  <path d="M4 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm2.625.547a3 3 0 0 0-5.584.953H.5a.5.5 0 0 0 0 1h.541A3 3 0 0 0 7 8a1 1 0 0 1 2 0 3 3 0 0 0 5.959.5h.541a.5.5 0 0 0 0-1h-.541a3 3 0 0 0-5.584-.953A1.993 1.993 0 0 0 8 6c-.532 0-1.016.208-1.375.547zM14 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
                </svg>
              )
            )}
          </span>
          <br/>
          <br/>
          <hr/>
          <div className="comments-section">
            <button
              className="comments-toggle"
              onClick={() => {
                playButtonSound();
                setShowComments(!showComments);
              }}
            >
              <div className="comments-toggle-icon">
                {showComments ? '▼' : '▶'}
              </div>
              <span className="comments-toggle-text">
                Comments
              </span>
            </button>
            {showComments && (
              <div className="comments-widget-container">
                <CommentsWidget pageSlug={`/${normalizeTitle(title || '')}`} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Post;