'use client'

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react'

interface PostData {
  title: string
  normalized_title?: string
  likesCount: number
  isLiked: boolean
  [key: string]: unknown
}

interface LikesContextType {
  likesData: PostData[]
  isLoading: boolean
  // Mark a post as read/unread. Identified by its normalized_title (stable
  // across title edits). Title kept as a second arg for the on-screen state
  // map only.
  updateLikesData: (
    normalizedTitle: string,
    title: string,
    newLikesCount: number,
    isLiked: boolean
  ) => void
}

interface LikesProviderProps {
  children: ReactNode
}

const STORAGE_KEY = 'readPosts'

export const LikesContext = createContext<LikesContextType | undefined>(undefined)

export const LikesProvider: React.FC<LikesProviderProps> = ({ children }) => {
  const [likesData, setLikesData] = useState<PostData[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [mounted, setMounted] = useState(false)

  // Read state is stored as a Set of normalized_title strings.
  // We migrate older title-keyed data on first load.
  const getReadStatusFromStorage = (): Set<string> => {
    if (typeof window === 'undefined') return new Set()
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch (error) {
      console.error('Error loading read status from localStorage:', error)
      return new Set()
    }
  }

  const saveReadStatusToStorage = (readPosts: Set<string>): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(readPosts)))
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

      const stored = getReadStatusFromStorage()

      // One-time migration: if the stored set contains items that don't match
      // any normalized_title but DO match a title, rewrite to normalized_title.
      // This rescues read state from before the keying change.
      const titleToNormalized = new Map<string, string>()
      for (const post of rssData) {
        if (post.title && post.normalized_title) {
          titleToNormalized.set(post.title, post.normalized_title)
        }
      }
      let migrated = false
      const upgraded = new Set<string>()
      for (const key of stored) {
        if (titleToNormalized.has(key) && !rssData.some(p => p.normalized_title === key)) {
          // key is a stale title — convert
          upgraded.add(titleToNormalized.get(key) as string)
          migrated = true
        } else {
          upgraded.add(key)
        }
      }
      if (migrated) saveReadStatusToStorage(upgraded)

      return rssData.map(post => ({
        ...post,
        isLiked: post.normalized_title ? upgraded.has(post.normalized_title) : false
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

  const updateLikesData = (
    normalizedTitle: string,
    title: string,
    newLikesCount: number,
    isLiked: boolean
  ): void => {
    if (!mounted) return
    if (!normalizedTitle) return

    const readPosts = getReadStatusFromStorage()
    if (isLiked) {
      readPosts.add(normalizedTitle)
    } else {
      readPosts.delete(normalizedTitle)
    }
    saveReadStatusToStorage(readPosts)

    setLikesData((prev) => {
      const idx = prev.findIndex((p) => p.normalized_title === normalizedTitle)
      if (idx === -1) {
        // Post wasn't in the cached list — append a stub so subsequent
        // reads find it. RSS will refresh on next mount.
        return [...prev, { title, normalized_title: normalizedTitle, likesCount: newLikesCount, isLiked }]
      }
      const next = prev.slice()
      next[idx] = { ...next[idx], likesCount: newLikesCount, isLiked }
      return next
    })
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
