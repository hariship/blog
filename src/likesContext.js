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

  const updateLikesData = async (postTitle, newLikesCount) => {
    try {
      const response = await fetch('https://api.haripriya.org/update-likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: postTitle, likesCount: newLikesCount }), 
      });

      if (!response.ok) {
        throw new Error('Failed to update likes count');
      }

      setLikesData((prevLikesData) =>
        prevLikesData.map((post) =>
          post.title === postTitle ? { ...post, likesCount: newLikesCount } : post
        )
      );
    } catch (error) {
      console.error('Error updating likes count:', error);
    }
  };

  return (
    <LikesContext.Provider value={{ likesData, isLoading, updateLikesData }}>
      {children}
    </LikesContext.Provider>
  );
};

export const useLikes = () => useContext(LikesContext);