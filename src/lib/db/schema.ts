import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  json,
} from 'drizzle-orm/pg-core'

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  normalized_title: text('normalized_title').notNull(),
  description: text('description'),
  content: text('content').notNull(),
  category: text('category'),
  image_url: text('image_url'),
  enclosure: text('enclosure'),
  pub_date: timestamp('pub_date', { withTimezone: true }).defaultNow(),
  inkhouse_published: boolean('inkhouse_published').default(false),
})

export const likes = pgTable('likes', {
  id: serial('id').primaryKey(),
  post_id: integer('post_id').references(() => posts.id),
  likes_count: integer('likes_count').default(0),
})

export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  username: text('username'),
  password_hash: text('password_hash').notNull(),
})

export const subscribers = pgTable('subscribers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  categories: json('categories').$type<string[]>(),
  frequency: text('frequency'),
  status: text('status').default('active'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
