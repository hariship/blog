import React, { createContext, useState, useEffect, useContext } from 'react';

export const LikesContext = createContext();

export const LikesProvider = ({ children }) => {
  const [likesData, setLikesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLikesData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('https://api.haripriya.org/scrape');
        const data = await response.json();
        setLikesData(data);
      } catch (error) {
        console.error('Error fetching likes data:', error);
      }
      setIsLoading(false);
    };

    fetchLikesData();
  }, []);

    // Function to update likes data
    const updateLikesData = (newLikesData) => {
      setLikesData(newLikesData);
    };
  

  return (
    <LikesContext.Provider value={{ likesData, isLoading, updateLikesData }}>
      {children}
    </LikesContext.Provider>
  );
};

export const useLikes = () => useContext(LikesContext);
