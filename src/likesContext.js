import React, { createContext, useState, useEffect, useContext } from 'react';

export const LikesContext = createContext();

export const LikesProvider = ({ children }) => {
  const [likesData, setLikesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch post data (including likes)
  const fetchPostData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://api.haripriya.org/rss-feed'); // Fetch the post data with likes count
      const data = await response.json();
      setLikesData(data);
    } catch (error) {
      console.error('Error fetching post data:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPostData();
  }, []);

  // Function to update likes data locally and persist to the backend
  const updateLikesData = async (postTitle, newLikesCount) => {
    try {
      // Send the updated likes count to the backend
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

      // Update the local state after the server update is successful
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