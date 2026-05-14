import { Metadata } from 'next'
import { db } from '@/lib/db'
import { posts, likes } from '@/lib/db/schema'
import { eq, ne, and, lt, gt, desc, asc } from 'drizzle-orm'
import PostClient from './PostClient'

interface Props {
  params: Promise<{ title: string }>
}

export interface PostData {
  id: number
  content: string
  title: string
  pub_date: string
  category: string
  enclosure: string
  likesCount: number
  description?: string
  inkhouse_published?: boolean
  updated_at?: string
}

export interface AdjacentPost {
  id: number
  title: string
  normalized_title: string
}

const normalizeTitle = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s\-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function getPost(title: string): Promise<PostData | null> {
  const normalized = normalizeTitle(title)

  const rows = await db
    .select({
      id: posts.id,
      content: posts.content,
      title: posts.title,
      pub_date: posts.pub_date,
      category: posts.category,
      enclosure: posts.enclosure,
      description: posts.description,
      inkhouse_published: posts.inkhouse_published,
      updated_at: posts.updated_at,
      likes_count: likes.likes_count,
    })
    .from(posts)
    .leftJoin(likes, eq(posts.id, likes.post_id))
    .where(eq(posts.normalized_title, normalized))
    .limit(1)

  if (rows.length === 0) {
    return null
  }

  const post = rows[0]
  return {
    id: post.id,
    content: post.content,
    title: post.title,
    pub_date: post.pub_date?.toISOString() || '',
    category: post.category || '',
    enclosure: post.enclosure || '',
    likesCount: post.likes_count || 0,
    description: post.description ?? undefined,
    inkhouse_published: post.inkhouse_published || false,
    updated_at: post.updated_at?.toISOString() || undefined,
  }
}

// Adjacent log entries by id (insertion order, matching the LOG·NNN scheme).
// Excludes the /now row. Returns nulls at the ends.
async function getAdjacentPosts(currentId: number): Promise<{ prev: AdjacentPost | null; next: AdjacentPost | null }> {
  const select = { id: posts.id, title: posts.title, normalized_title: posts.normalized_title }

  const [prevRow] = await db
    .select(select)
    .from(posts)
    .where(and(lt(posts.id, currentId), ne(posts.normalized_title, 'now')))
    .orderBy(desc(posts.id))
    .limit(1)

  const [nextRow] = await db
    .select(select)
    .from(posts)
    .where(and(gt(posts.id, currentId), ne(posts.normalized_title, 'now')))
    .orderBy(asc(posts.id))
    .limit(1)

  return {
    prev: prevRow ? { id: prevRow.id, title: prevRow.title, normalized_title: prevRow.normalized_title } : null,
    next: nextRow ? { id: nextRow.id, title: nextRow.title, normalized_title: nextRow.normalized_title } : null,
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { title } = await params
  const post = await getPost(title)

  const postTitle = post?.title || 'Blog Post'
  const description = post?.description || 'Read this blog post by Hari'
  const normalized = normalizeTitle(title)

  let ogImage = 'https://blog.haripriya.org/logo192.png'
  if (post?.enclosure) {
    if (post.enclosure.startsWith('http')) {
      ogImage = post.enclosure
    } else {
      ogImage = `https://blog.haripriya.org${post.enclosure.startsWith('/') ? '' : '/'}${post.enclosure}`
    }
  }

  return {
    title: postTitle,
    description: description,
    openGraph: {
      title: postTitle,
      description: description,
      url: `https://blog.haripriya.org/post/${normalized}`,
      type: 'article',
      siteName: "Hari's Blog",
      images: [
        {
          url: ogImage,
          secureUrl: ogImage,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: postTitle,
      description: description,
      images: [ogImage],
    },
  }
}

export default async function PostPage({ params }: Props) {
  const { title } = await params
  const initialPost = await getPost(title)
  const adjacent = initialPost
    ? await getAdjacentPosts(initialPost.id)
    : { prev: null, next: null }
  return <PostClient title={title} initialPost={initialPost} adjacent={adjacent} />
}
