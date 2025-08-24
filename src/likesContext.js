import React, { createContext, useState, useEffect, useContext } from 'react';

export const LikesContext = createContext();

export const LikesProvider = ({ children }) => {
  const [likesData, setLikesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRSSFeed = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/rss-feed`);
      const rssData = await response.json();
      return rssData;
    } catch (error) {
      console.error('Error fetching RSS feed:', error);
      return [];
    }
  };

  const loadLikesData = async () => {
    if (!likesData.length) {
      setIsLoading(true);
      const rssFeedData = await fetchRSSFeed();
      setLikesData(rssFeedData);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLikesData();
  }, [likesData]);

  const updateLikesData = (postTitle, newLikesCount, isLiked) => {
    setLikesData((prevLikesData) =>
      prevLikesData.map((post) =>
        post.title === postTitle
          ? { ...post, likesCount: newLikesCount, isLiked } // Update likesCount and isLiked status
          : post
      )
    );
  };

  return (
    <LikesContext.Provider value={{ likesData, isLoading, updateLikesData }}>
      {children}
    </LikesContext.Provider>
  );
};

export const useLikes = () => useContext(LikesContext);