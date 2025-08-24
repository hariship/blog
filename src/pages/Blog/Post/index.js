import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import parse, { domToReact } from 'html-react-parser';
import './Post.css';
import { useLikes } from '../../../contexts/LikesContext';
import { IoIosArrowBack } from 'react-icons/io';
import { Helmet } from 'react-helmet';
import CommentsWidget from "../../../components/widgets/CommentsWidget";

// Import our local content
import * as htmlContents from '../../../data/html-content';

// Function to normalize the title (similar to server-side logic)
const normalizeTitle = (title) => {
  return title
    .toLowerCase()
    .replace(/[^\w\s\-]/g, '')   // Remove special characters
    .replace(/\s+/g, '-')        // Replace spaces with hyphens
    .replace(/-+/g, '-');        // Replace multiple hyphens with a single hyphen
};

const formatDate = (dateString) => {
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

const Post = () => {
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postDate, setPostDate] = useState('');
  const [postCategory, setPostCategory] = useState('');
  const [postImage, setPostImage] = useState('');
  const { likesData, updateLikesData } = useLikes();
  const [likesCount, setLikesCount] = useState(null); // Set initial likesCount to null
  const [description, setDescription] = useState('');
  const [isLiked, setIsLiked] = useState(null); // Set initial isLiked to null
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { title } = useParams(); // Get title from URL params
  const normalized = normalizeTitle(title); // Normalize title
  const isJournal = normalized === 'life-lately-20-2025';

  // Fetch post content by title
  const fetchPostContent = async (postTitleFromURL) => {
    const normalizedTitle = normalizeTitle(postTitleFromURL); // Normalize title

    const targetUrl = `${process.env.REACT_APP_API_BASE_URL}/post/${normalizedTitle}`;
    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error('Post not found');
      }
      
      const post = await response.json();
  
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
  
        const postLikesData = likesData.find(like => like.title === title);
        if (postLikesData) {
          setLikesCount(postLikesData.likesCount);
          setIsLiked(postLikesData.isLiked);
        } else {
          setLikesCount(0);
          setIsLiked(false);
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
  const checkLocalContent = (normalizedTitle) => {
    // Convert dashes to underscores for JavaScript variable naming
    const contentKey = normalizedTitle.replace(/-/g, '_');
    return htmlContents[contentKey] !== undefined;
  };

  // Load content from local files
  // Add these debug lines to your loadLocalContent function:

  const loadLocalContent = (normalizedTitle) => {
    try {
      // Convert dashes to underscores for JavaScript variable naming
      const contentKey = normalizedTitle.replace(/-/g, '_');
      
      console.log("Looking for content with key:", contentKey);
      console.log("Available content keys:", Object.keys(htmlContents));
      
      if (htmlContents[contentKey]) {
        console.log("Content found? Yes");
        console.log("Content length:", htmlContents[contentKey].length);
        console.log("Content preview:", htmlContents[contentKey].substring(0, 100));
        
        // Try updating both the state and directly modifying the DOM
        setPostContent(htmlContents[contentKey]);
        
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
    fetchPostContent(title);
  }, [title, likesData]);

  const handleGoBack = () => {
    navigate('/');
  };

  const handleLikeToggle = async () => {
    const newIsLiked = !isLiked;
    let updatedLikesCount = newIsLiked ? likesCount + 1 : likesCount - 1;

    // Ensure likesCount is an integer
    updatedLikesCount = parseInt(updatedLikesCount, 10);
    updateLikesData(postTitle, updatedLikesCount, newIsLiked);
    setIsLiked(newIsLiked);
    setLikesCount(updatedLikesCount);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/update-likes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: postTitle, likesCount: updatedLikesCount }),
      });

      if (response.ok) {
        // Update context data only when server confirms
        updateLikesData(postTitle, updatedLikesCount, newIsLiked);
        setIsLiked(newIsLiked);
        setLikesCount(updatedLikesCount);
      } else {
        throw new Error('Failed to update likes');
      }
    } catch (error) {
      console.error('Failed to update likes:', error);

      // Revert the UI changes if the server request fails
      setIsLiked(isLiked);
      setLikesCount(likesCount);
    }
  };

  return (
    <div className={`post-container ${isJournal ? 'journal-post' : ''}`}>
      <Helmet>
        <title>{postTitle}</title>
        <meta property="og:title" content={postTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={postImage} />
      </Helmet>
      {loading ? (
        <div className="loader"></div>
      ) : (
          <>
          <div className="back-button" onClick={handleGoBack}>
            <IoIosArrowBack className="back-icon" style={{ cursor: 'pointer' }} />
          </div>
          <h1 className="post-title">{parse(postTitle)}</h1>
          <div className="post-meta">
            <span className="author-name">Haripriya Sridharan</span> &bull;
            <span className="post-date">
              &nbsp;{formatDate(postDate)} &bull;
            </span>
            <span className="post-category">&nbsp;{postCategory}</span>
            {isJournal && <hr style={{ marginTop: '2rem' }} />}
          </div>
          <div className="post-content">
                {
                    parse(postContent, {
                    replace: (domNode) => {
                        if (domNode.attribs && domNode.attribs.style) {
                        delete domNode.attribs.style;
                        }
                    }
                    })
                }
        </div>

          <span onClick={handleLikeToggle} style={{ cursor: 'pointer' }}>
            {likesCount !== null && ( // Only show the heart after likes update
              <svg
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                height="1em"
                width="1em"
                style={{ color: 'black', fill: isLiked ? 'red' : 'none', stroke: isLiked ? 'none' : 'red' }}
              >
                <path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
              </svg>
            )}
            &nbsp;{likesCount !== null ? parseInt(likesCount) || '' : ''}
          </span>
          <br/>
          <br/>
          <hr/>
          <CommentsWidget pageSlug={`/${normalizeTitle(title)}`} />
        </>
      )}
    </div>
  );
};

export default Post;