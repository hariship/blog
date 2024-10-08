import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import parse from 'html-react-parser';
import './Post.css';
import { useLikes } from './likesContext';
import { IoIosArrowBack } from 'react-icons/io';
import { Helmet } from 'react-helmet';

const Post = () => {
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postDate, setPostDate] = useState('');
  const [postCategory, setPostCategory] = useState('');
  const [postImage, setPostImage] = useState(''); // New state for image URL
  const { likesData, updateLikesData } = useLikes();
  const [likesCount, setLikesCount] = useState(0);
  const [description, setDescription] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true); // Add loading state
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {

    const fetchPostContent = async () => {
      const targetUrl = 'https://api.haripriya.org/rss-feed';
      try {
        const response = await fetch(targetUrl);
        const data = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, 'text/xml');
        const items = xmlDoc.querySelectorAll('item');
        const rssItem = Array.from(items).find(item => {
          const slug = item.querySelector('title').textContent.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-');
          return slug === location.pathname.substring(location.pathname.lastIndexOf('/') + 1);
        });
  
        if (rssItem) {
          const title = rssItem.querySelector('title').textContent;
          const description = rssItem.querySelector('description').textContent;
          const pubDate = rssItem.querySelector('pubDate').textContent;
          const category = rssItem.querySelector('category') ? rssItem.querySelector('category').textContent : '';
          const content = rssItem.querySelector('content\\:encoded, encoded').textContent;
          const image = rssItem.querySelector('enclosure') ? rssItem.querySelector('enclosure').getAttribute('url') : ''; // Extract image URL
  
          setPostTitle(title);
          setPostDate(pubDate);
          setPostCategory(category);
          setPostContent(content);
          setPostImage(image);
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
        setLoading(false); // Set loading to false once data is fetched
      }
    }; 

    const post = location.state || {};

    if (!post || post === '' || Object.values(post).length === 0) {
      fetchPostContent();
    } else {
      const { content, title, pubDate, category, image } = post;

      const date = pubDate;
      const cleanedContent = content ? content.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>').replace(/(<br>\s*<\/(ul|p|li)>)/gi, '</$2>') : '';

      setPostDate(date || '');
      setPostCategory(category || '');
      setPostContent(cleanedContent || '');
      setPostTitle(title || '');
      setPostImage(image || ''); // Set image URL


      const postLikesData = likesData.find(like => like.title === title);
      if (postLikesData) {
        setLikesCount(postLikesData.likesCount);
        setIsLiked(postLikesData.isLiked);
      } else {
        setLikesCount(0);
        setIsLiked(false);
      }
      setLoading(false); // Set loading to false if data is already present
    }

  }, [location, likesData]);

  const handleGoBack = () => {
    navigate("/");
  };

  const handleLikeToggle = async () => {
    const newIsLiked = !isLiked;
    const updatedLikesCount = newIsLiked ? parseInt(likesCount) + 1 : parseInt(likesCount) - 1;

    try {
      const response = await fetch('https://api.haripriya.org/update-likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: postTitle, likesCount: updatedLikesCount.toString() }),
      });
      const data = await response.json();
      if (response.ok) {
        updateLikesData(
          likesData.map(like => (like.title === postTitle ? { ...like, likesCount: updatedLikesCount, isLiked: newIsLiked } : like))
        );
        setIsLiked(newIsLiked);
        setLikesCount(updatedLikesCount);
      } else {
        throw new Error(data.message || 'Failed to update the like status on the server.');
      }
    } catch (error) {
      console.error('Failed to update likes:', error);
    }
  };

  return (
    <div className="post-container">
      <Helmet>
        <title>{postTitle}</title>
        <meta property="og:title" content={postTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={postImage} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={postTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={postImage} />
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
            <span className="post-category">
              &nbsp;{postDate && parse(postCategory)}
            </span>
            <hr />
          </div>
          <div className="post-content">{parse(postContent)}</div>
          <span onClick={handleLikeToggle} style={{ cursor: 'pointer' }}>
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
            &nbsp;{likesCount}
          </span>
        </>
      )}
    </div>
  );
};

export default Post;
