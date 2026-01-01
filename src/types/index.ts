// Shared type definitions for the blog application

export interface Post {
  id: number
  title: string
  normalized_title: string
  description?: string
  image_url?: string
  link?: string
  pub_date: string
  content: string
  category?: string
  enclosure?: string
}

export interface PostWithLikes extends Post {
  likes?: {
    likes_count: number
  }[]
  likesCount?: number
  isRead?: boolean
  inkhouse_published?: boolean
}

export interface BlogPost {
  title: string
  content: string
  description?: string
  category: string
  pubDate: string
  enclosure?: string
  image_url?: string
  likesCount: number
  isLiked: boolean
}

export interface Subscriber {
  id: number
  email: string
  name?: string
  categories?: string[]
  frequency?: 'daily' | 'weekly' | 'monthly'
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface SubscriptionFormData {
  email: string
  name: string
  categories: string[]
  frequency: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PostFormData {
  title: string
  description: string
  image_url: string
  content: string
  category: string
  enclosure: string
  publishImmediately?: boolean
  enableComments?: boolean
  featured?: boolean
  sendNewsletter?: boolean
}

export interface PostSettings {
  publishImmediately: boolean
  enableComments: boolean
  featured: boolean
  sendNewsletter: boolean
}

export interface Goal {
  id: number
  text: string
  icon: React.ReactNode
  completed: boolean
}

// Component Props Interfaces
export interface AdminLoginProps {
  onLoginSuccess: () => void
}

export interface CommentsWidgetProps {
  pageSlug?: string
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  className?: string
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

// Status and Message Types
export interface StatusMessage {
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

export interface SubmitStatus {
  type: 'success' | 'error'
  message: string
}

// Pagination
export interface PaginationInfo {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
}

// Admin User
export interface AdminUser {
  id: number
  username: string
  password_hash: string
}

// Email Log
export interface EmailLog {
  id: number
  subscriber_id?: number
  email: string
  post_id?: number
  subject: string
  sent_at: string
  status: 'sent' | 'failed'
  error?: string
}

// Contact
export interface Contact {
  id: number
  name: string
  email?: string
  phone?: string
  source?: string
  synced_at: string
  deleted_at?: string
}
