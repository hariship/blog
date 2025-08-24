// Shared type definitions for the blog application

export interface BlogPost {
  title: string;
  content: string;
  description?: string;
  category: string;
  pubDate: string;
  enclosure?: string;
  image_url?: string;
  likesCount: number;
  isLiked: boolean;
}

export interface Subscriber {
  email: string;
  name: string;
  categories: string[];
  frequency: 'daily' | 'weekly' | 'monthly';
  status: 'active' | 'inactive';
  subscribed_at: string;
}

export interface SubscriptionFormData {
  email: string;
  name: string;
  categories: string[];
  frequency: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PostFormData {
  title: string;
  description: string;
  image_url: string;
  content: string;
  category: string;
  enclosure: string;
}

export interface Goal {
  id: number;
  text: string;
  icon: React.ReactNode;
  completed: boolean;
}

// Component Props Interfaces
export interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export interface CommentsWidgetProps {
  pageSlug?: string;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

// Status and Message Types
export interface StatusMessage {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export interface SubmitStatus {
  type: 'success' | 'error';
  message: string;
}

// Pagination
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
}

// Environment Variables
export interface EnvironmentVariables {
  REACT_APP_API_BASE_URL: string;
  REACT_APP_BLOG_EXTRAS_URL: string;
  REACT_APP_NOTION_HERO_MOVIES_EMBED: string;
  REACT_APP_NOTION_HERO_BOOKS_EMBED: string;
  REACT_APP_ENCRYPTION_KEY?: string;
}