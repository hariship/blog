import React, { createContext, useState, useEffect, useContext } from 'react';

export const LikesContext = createContext();

export const LikesProvider = ({ children }) => {
  const [likesData, setLikesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchScrapeData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://api.haripriya.org/scrape'); // Fetch full post data with likes
      const data = await response.json();
      setLikesData(data); // Set data (including likesCount) into state
    } catch (error) {
      console.error('Error fetching scraped data:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchScrapeData();
  }, []);

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