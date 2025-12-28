import { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import PostClient from './PostClient'

interface Props {
  params: Promise<{ title: string }>
}

const normalizeTitle = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s\-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function getPost(title: string) {
  const normalized = normalizeTitle(title)

  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('normalized_title', normalized)
    .single()

  return post
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
  return <PostClient title={title} />
}
