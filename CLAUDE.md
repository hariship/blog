# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js (App Router) TypeScript blog application with RSS feed support. The application includes:
- Blog posts with RSS feed functionality
- Content pages for personal goals
- Admin CMS dashboard with rich text editor (React Quill)
- Auto-save functionality (every 5 seconds) with LocalStorage persistence
- Dark/light theme support with earthy color palette
- Sound effects context
- Social media preview optimization (WhatsApp, Slack, Instagram)
- Custom toggle blocks and formatting in blog posts
- External Apps navigation link (apps.haripriya.org)
- Coffee/Support feature with payment QR and calendar scheduling
- Continuous animations for navbar elements (coffee, RSS, theme toggle)

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 3000)
npm run dev
# or
npm start

# Build for production (outputs to build/)
npm run build

# Preview production build
npm run preview
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router) with React 18 and TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: CSS (custom properties for theming), Quill editor styles
- **State Management**: React Context API for likes, sounds, theme, and admin auth

### Project Structure
- `src/app/` - Next.js App Router pages and API routes:
  - `page.tsx` - Home page with feed views (list, grid, compact, magazine)
  - `post/[title]/` - Individual post pages (server + client components)
  - `admin/cms/` - CMS editor (create and edit posts)
  - `coffee/` - Coffee/support page
  - `personal-goals/` - Personal goals page
  - `api/` - API routes (posts, admin/post, admin/inkhouse, update-likes, rss, etc.)
- `src/components/` - Reusable components:
  - `common/` - ThemeToggle, SoundToggle
  - `layout/` - Navigation components (Navbar with coffee button)
  - `widgets/` - SubscribeToRSS, CommentsWidget, RSSFeedButton, BuyMeCoffee, CoffeeLink
  - `ViewSwitcher/` - View mode switching component
- `src/contexts/` - Context providers for shared state (Likes, Sound, Theme, Admin)
- `src/types/` - TypeScript type definitions
- `src/lib/` - Supabase client configuration

### Key Configuration
- Environment variables loaded via Next.js (`process.env.*`)
- Supabase connection configured via `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- JWT secret for admin auth via `JWT_SECRET`
- TypeScript configured with strict mode in `tsconfig.json`
- Deployed to Vercel

### API Integration (Next.js API Routes)
- `GET /api/posts` - Fetch paginated posts with category/search filters
- `GET /api/post/[title]` - Fetch individual post by normalized title
- `POST /api/admin/post` - Create or update posts (JWT auth required, supports `id` for edit)
- `POST /api/admin/inkhouse` - Cross-post to InkHouse (JWT auth required)
- `POST /api/update-likes` - Update read/likes count (`{ postTitle, increment }`)
- `POST /api/upload-image` - Upload and serve images
- `GET /api/rss` - RSS feed data
- `GET /api/categories` - List all categories

### Database
- **Supabase (PostgreSQL)** with tables for posts, likes, and admin auth
- Posts table includes: `id`, `title`, `normalized_title`, `description`, `content`, `category`, `image_url`, `enclosure`, `pub_date`, `inkhouse_published`

## Key Features

### Admin CMS Editor
- **Rich Text Editing**: React Quill with custom toolbar
- **Auto-Save**: Drafts saved to LocalStorage every 5 seconds
- **Manual Save**: Dedicated save button for immediate draft persistence
- **Draft Restoration**: Automatically loads last saved draft on page refresh
- **Custom Blocks**:
  - `[TOGGLE] Title` / `[END TOGGLE]` - Collapsible content sections
  - Horizontal rules (HR)
  - Standard formatting (bold, italic, headers, lists, links, images, code blocks)
- **Preview Mode**: Live preview with processed toggle blocks
- **Settings Panel**: Publish immediately, enable comments, featured post, newsletter options
- **Mobile Responsive**: Fully functional on tablets and phones
- **Color Scheme**: Blue submit button in light mode, earthy brown in dark mode

### Theme System
- Dark/light mode toggle
- Earthy color palette in dark mode
- Persists preference to LocalStorage
- Respects system preferences on first load

### Social Media Integration
- Open Graph meta tags for rich previews
- Optimized for WhatsApp, Slack, and Instagram sharing
- Proper absolute URL generation for images
- Fallback to logo192.png if no post image

### Navigation
- Home
- Personal Goals
- Apps (external link to apps.haripriya.org)
- Coffee button in navbar (opens modal)
- Coffee page at `/coffee` route (shareable link)

### Author Attribution
All posts are attributed to "Hari" throughout the application.

## Important Implementation Notes

### CMS Auto-Save System
- Located in `src/app/admin/cms/page.tsx`
- Auto-save interval: 5 seconds (5000ms)
- Saves to `localStorage` with key: `cms-draft`
- Includes timestamp in saved data for "Saved at" indicator
- Manual save button works identically to auto-save (no image processing on save)
- Image processing only happens during final post submission

### Toggle Blocks Processing
- Editor uses markers: `[TOGGLE] Title` and `[END TOGGLE]`
- Preview mode converts markers to `<details>` and `<summary>` HTML elements
- Regex processing in `processContentForPreview()` function
- Supports nested content between toggle markers

### CSS Architecture
- Uses CSS custom properties (variables) for theming
- Mobile breakpoints: 768px (tablet), 480px (mobile)
- Dark mode selector: `[data-theme="dark"]`
- Earthy color palette for dark mode save indicators and buttons

### Open Graph Meta Tags
- Handled by Next.js `generateMetadata()` in `src/app/post/[title]/page.tsx`
- Base domain: `https://blog.haripriya.org`
- Includes width/height tags for proper rendering

### External Links
- Apps link uses standard `<a>` tag with `target="_blank"` and `rel="noopener noreferrer"`
- Not routed through React Router since it's external

### Coffee/Support Feature
- **Three Components**:
  - `BuyMeCoffee` - Modal button in navbar
  - `CoffeeLink` - Inline link component for blog posts
  - `Coffee` page - Standalone page at `/coffee` route
- **Two Options**:
  - "Buy me a coffee" - Shows QR code for payment (expects `/public/coffee-qr.png`)
  - "Have a chat" - Opens Google Calendar event creation with pre-filled details
- **Features**:
  - Theme toggle in modal header
  - Email: mailtoharipriyas@gmail.com
  - All icons use React Icons (BiCoffeeTogo, BiDollar, BiCalendar, BiChat, BiGlobe)
  - Earthy brown color scheme using `--color-accent-warm` theme variable
  - Mobile responsive with coffee link in sidebar
  - Calendar integration via Google Calendar URL with event template

### Animations
- **Coffee icon (navbar)**: Heartbeat animation (1.5s) - double pulse like "ba-dum, ba-dum"
- **Coffee icon (modal)**: Bounce animation (1s) - vertical movement
- **RSS feed icon**: Pulse animation (2s) - opacity and scale change
- **Theme toggle**: Glow animation (3s) - yellow drop-shadow pulse
- All animations use `ease-in-out` timing and run infinitely

### Mark as Read Feature
- **Status**: Visible in all views (post page, list, grid, compact, magazine)
- Displays a checkmark icon when read, unread icon otherwise
- Text label: "Mark as read" / "Read" shown on post page (top meta + bottom right)
- Hover tooltip: "Mark as read" / "Mark as unread" on feed views
- **Data flow**:
  - Read status stored in `localStorage` under `readPosts` key (per-browser)
  - Server-side likes count updated via `/api/update-likes` with `{ postTitle, increment }` payload
  - `LikesContext` merges server likes data with localStorage read status
- Located in:
  - `src/app/page.tsx` (list, grid, compact, magazine views)
  - `src/app/post/[title]/PostClient.tsx` (individual post - top and bottom)

### Edit Post Feature (Admin Only)
- **Edit Button**: Appears on individual post pages next to InkHouse controls, visible only to authenticated admins
- **Flow**: Click Edit → stores post data (`id`, `title`, `description`, `content`, `category`, `image_url`) in `localStorage` under `cms-edit-post` → navigates to `/admin/cms?edit=<post-id>`
- **CMS Edit Mode**: Checks for `edit` query param on mount, loads post data from `cms-edit-post` localStorage
  - Header shows "Edit Post" instead of "Create New Post"
  - Submit button shows "Update Post" instead of "Publish Post"
  - Sends post `id` in API request body for direct ID-based updates (allows title changes)
- **API**: `POST /api/admin/post` accepts optional `id` field — if provided, updates by ID directly; otherwise falls back to `normalized_title` lookup
- `resetForm()` clears `editingPostId` state and removes `cms-edit-post` from localStorage
- Button styled with earthy brown (`#8b6f47`) matching InkHouse button

### InkHouse Cross-Posting
- **Integration**: Cross-posts blog content to inkhouse.haripriya.org
- **Admin Controls**:
  - Toggle switch on feed views (list, grid, compact) for per-post publishing
  - "Publish to InkHouse" button on individual post pages
  - "Publish to InkHouse" toggle in CMS settings panel for publishing on post creation
- **API Route**: `POST /api/admin/inkhouse` — requires admin JWT auth
- **State**: `inkhouse_published` field tracked per post, shows "Published" badge when done
- **Error Handling**: Retry button in CMS if InkHouse publish fails after post creation

### Admin Authentication Context
- **Location**: `src/contexts/AdminContext.tsx`
- Provides `isAdmin`, `adminToken`, and `mounted` state via React Context
- Reads `adminToken` and `adminTokenExpiry` from localStorage
- Token expires after 24 hours
- Used by PostClient and home page to conditionally render admin controls (Edit, InkHouse)

### Image Compression
- **Location**: `src/app/admin/cms/page.tsx`
- **Function**: `compressImage()` - Compresses images for WhatsApp compatibility
- **Target**: ~300KB file size
- **Process**:
  - Resizes to max 1200px width/height
  - Converts to JPEG format
  - Iteratively adjusts quality from 80% to 50%
  - Uses Canvas API for processing
- **Trigger**: Only runs during final post submission, not on draft save

### Theme Colors
- **Earthy Accent Colors**: Added to `src/styles/theme.css`
  - `--color-accent-warm: #8b6f47` (earthy brown)
  - `--color-accent-warm-hover: #a08357` (lighter brown for hover)
- Used throughout coffee components for consistency
- Matches LCARS theme aesthetic
- Same color in both light and dark modes