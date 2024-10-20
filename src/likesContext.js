import React, { createContext, useState, useEffect, useContext } from 'react';

export const LikesContext = createContext();

export const LikesProvider = ({ children }) => {
  const [likesData, setLikesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data from the scrape endpoint
  const fetchScrapeData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://api.haripriya.org/scrape'); // Assuming this is the correct URL for scraping data
      const data = await response.json();
      setLikesData(data); // Set scraped data (including likesCount) into state
    } catch (error) {
      console.error('Error fetching scraped data:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchScrapeData(); // Fetch on initial render
  }, []);

  // Function to update likes count locally and update Redis via API
  const updateLikesData = async (postTitle, newLikesCount) => {
    try {
      // First, update the Redis with the new likesCount
      const response = await fetch('https://api.haripriya.org/update-likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: postTitle, likesCount: newLikesCount }), // Send updated likes count to backend
      });

      if (!response.ok) {
        throw new Error('Failed to update likes count');
      }

      // Now, update the local state (likesData) with the new likesCount
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