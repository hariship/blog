'use client'

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react'

interface PostData {
  title: string
  likesCount: number
  isLiked: boolean
  [key: string]: unknown
}

interface LikesContextType {
  likesData: PostData[]
  isLoading: boolean
  updateLikesData: (postTitle: string, newLikesCount: number, isLiked: boolean) => void
}

interface LikesProviderProps {
  children: ReactNode
}

export const LikesContext = createContext<LikesContextType | undefined>(undefined)

export const LikesProvider: React.FC<LikesProviderProps> = ({ children }) => {
  const [likesData, setLikesData] = useState<PostData[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [mounted, setMounted] = useState(false)

  // Load read status from localStorage
  const getReadStatusFromStorage = (): Set<string> => {
    if (typeof window === 'undefined') return new Set()
    try {
      const stored = localStorage.getItem('readPosts')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch (error) {
      console.error('Error loading read status from localStorage:', error)
      return new Set()
    }
  }

  // Save read status to localStorage
  const saveReadStatusToStorage = (readPosts: Set<string>): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem('readPosts', JSON.stringify(Array.from(readPosts)))
    } catch (error) {
      console.error('Error saving read status to localStorage:', error)
    }
  }

  const fetchRSSFeed = async (): Promise<PostData[]> => {
    try {
      const response: Response = await fetch('/api/rss')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const rssData: PostData[] = await response.json()

      // Merge with localStorage read status
      const readPosts = getReadStatusFromStorage()
      return rssData.map(post => ({
        ...post,
        isLiked: readPosts.has(post.title)
      }))
    } catch (error) {
      console.warn('Could not fetch RSS feed for likes:', error)
      return []
    }
  }

  const loadLikesData = async (): Promise<void> => {
    if (!likesData.length) {
      setIsLoading(true)
      const rssFeedData: PostData[] = await fetchRSSFeed()
      setLikesData(rssFeedData)
      setIsLoading(false)
    } else {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    loadLikesData()
  }, [])

  const updateLikesData = (postTitle: string, newLikesCount: number, isLiked: boolean): void => {
    if (!mounted) return

    // Update localStorage
    const readPosts = getReadStatusFromStorage()
    if (isLiked) {
      readPosts.add(postTitle)
    } else {
      readPosts.delete(postTitle)
    }
    saveReadStatusToStorage(readPosts)

    // Update state
    setLikesData((prevLikesData: PostData[]) =>
      prevLikesData.map((post: PostData) =>
        post.title === postTitle
          ? { ...post, likesCount: newLikesCount, isLiked }
          : post
      )
    )
  }

  return (
    <LikesContext.Provider value={{ likesData, isLoading, updateLikesData }}>
      {children}
    </LikesContext.Provider>
  )
}

export const useLikes = (): LikesContextType => {
  const context = useContext(LikesContext)
  if (context === undefined) {
    throw new Error('useLikes must be used within a LikesProvider')
  }
  return context
}
