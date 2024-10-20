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
      setLikesData(data); // Set scraped data (including likesCount) into state
    } catch (error) {
      console.error('Error fetching scraped data:', error);
    }
    setIsLoading(false);
  };

  const fetchRSSFeed = async () => {
    try {
      const response = await fetch('https://api.haripriya.org/rss-feed');
      const rssData = await response.json();
      return rssData;
    } catch (error) {
      console.error('Error fetching RSS feed:', error);
      return [];
    }
  };

  const checkAndScrapeIfNeeded = async () => {
    if (!likesData.length) {
      // If no likesData exists, fetch the RSS feed
      const rssFeedData = await fetchRSSFeed();

      // Check if all posts in the RSS feed also have likesCount === 0
      const shouldScrape = rssFeedData.every((post) => !post.likesCount || post.likesCount === 0);
      
      if (shouldScrape) {
        await fetchScrapeData(); // Trigger scraping only if necessary
      } else {
        // Use RSS feed data if likes data is available in it
        setLikesData(rssFeedData);
        setIsLoading(false);
      }
    } else {
      // If likesData is available, we can stop loading
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAndScrapeIfNeeded(); // Check and scrape only if needed
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