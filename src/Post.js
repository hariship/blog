import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import parse from 'html-react-parser';
import './Post.css';
import { useLikes } from './likesContext';
import { IoIosArrowBack } from 'react-icons/io';
import { Helmet } from 'react-helmet';
import CommentsWidget from "./CommentsWidget";
// Function to normalize the title (similar to server-side logic)
const normalizeTitle = (title) => {
  return title
    .toLowerCase()
    .replace(/[^\w\s\-]/g, '')   // Remove special characters
    .replace(/\s+/g, '-')        // Replace spaces with hyphens
    .replace(/-+/g, '-');        // Replace multiple hyphens with a single hyphen
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

  // Fetch post content by title
  const fetchPostContent = async (postTitleFromURL) => {
    const normalizedTitle = normalizeTitle(postTitleFromURL); // Normalize title
    const targetUrl = `https://api.haripriya.org/post/${normalizedTitle}`;
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
      }
    } catch (error) {
      console.error('Error fetching post content:', error);
    } finally {
      setLoading(false);
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
    // // Optimistic UI update (hide the heart and count initially)
    // setIsLiked(null);
    // setLikesCount(null);

    try {
      const response = await fetch('https://api.haripriya.org/update-likes', {
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
    <div className="post-container">
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
              &nbsp;{postDate && parse(new Date(postDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))} &bull;
            </span>
            <span className="post-category">&nbsp;{postCategory && parse(postCategory)}</span>
            <hr />
          </div>
          <div className="post-content">{parse(postContent)}</div>
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