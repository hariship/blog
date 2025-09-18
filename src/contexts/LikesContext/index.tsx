import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

interface PostData {
  title: string;
  likesCount: number;
  isLiked: boolean;
  [key: string]: any;
}

interface LikesContextType {
  likesData: PostData[];
  isLoading: boolean;
  updateLikesData: (postTitle: string, newLikesCount: number, isLiked: boolean) => void;
}

interface LikesProviderProps {
  children: ReactNode;
}

export const LikesContext = createContext<LikesContextType | undefined>(undefined);

export const LikesProvider: React.FC<LikesProviderProps> = ({ children }) => {
  const [likesData, setLikesData] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchRSSFeed = async (): Promise<PostData[]> => {
    try {
      const response: Response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/rss-feed`);
      const rssData: PostData[] = await response.json();
      return rssData;
    } catch (error) {
      console.error('Error fetching RSS feed:', error);
      return [];
    }
  };

  const loadLikesData = async (): Promise<void> => {
    if (!likesData.length) {
      setIsLoading(true);
      const rssFeedData: PostData[] = await fetchRSSFeed();
      setLikesData(rssFeedData);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLikesData();
  }, [likesData]);

  const updateLikesData = (postTitle: string, newLikesCount: number, isLiked: boolean): void => {
    setLikesData((prevLikesData: PostData[]) =>
      prevLikesData.map((post: PostData) =>
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

export const useLikes = (): LikesContextType => {
  const context = useContext(LikesContext);
  if (context === undefined) {
    throw new Error('useLikes must be used within a LikesProvider');
  }
  return context;
};