# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React TypeScript blog application with RSS feed support, built with Vite. The application includes:
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
- **Build Tool**: Vite 4.5.0
- **Framework**: React 18.3.1 with TypeScript 4.9.5
- **Routing**: React Router DOM v6
- **Styling**: CSS modules, Quill editor styles
- **State Management**: React Context API for likes, sounds, and theme

### Project Structure
- `src/App.tsx` - Main application router with routes for blog, content, subscription, and admin pages
- `src/pages/` - Page components organized by feature:
  - `Blog/` - RSSFeed and Post components
  - `Content/` - Movies, Books, PersonalGoals pages
  - `Admin/` - CMS dashboard and editor
  - `Subscribe/` - Subscription management
- `src/components/` - Reusable components:
  - `common/` - Button, Card, Input, Textarea, ThemeToggle, SoundToggle
  - `layout/` - Navigation components (Navbar with coffee button)
  - `widgets/` - SubscribeToRSS, CommentsWidget, RSSFeedButton, BuyMeCoffee, CoffeeLink
  - `ViewSwitcher/` - View mode switching component
- `src/contexts/` - Context providers for shared state (Likes, Sound, Theme)
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions

### Key Configuration
- Environment variables are loaded via Vite using `import.meta.env.VITE_*`
- API base URL configured as `VITE_API_BASE_URL`
- TypeScript configured with strict mode in `tsconfig.json`
- Vite configured to output to `build/` directory with static assets in `static/`

### API Integration
The application connects to an external API specified by `VITE_API_BASE_URL` environment variable for:
- Fetching blog posts from `/posts` endpoint
- Creating/editing posts via `/admin/post` endpoint
- Uploading images to `/upload-image` endpoint
- Updating like counts via `/update-likes` endpoint

### Database
SQL files in the root suggest a MySQL/PostgreSQL backend with tables for blog posts, admin users, and contacts.

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
- Located in `src/pages/Admin/CMSPostEditor/index.tsx`
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
- Handled by React Helmet in Post component
- `getAbsoluteImageUrl()` function ensures proper HTTPS URLs
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

### Like Feature
- **Status**: Hidden (not removed) throughout the application
- Implementation: `style={{ display: 'none' }}` added to like buttons
- Located in:
  - `src/pages/Blog/RSSFeed/index.tsx` (list and grid views)
  - `src/pages/Blog/Post/index.tsx` (individual posts)
- Backend integration still intact, just UI hidden

### Image Compression
- **Location**: `src/pages/Admin/CMSPostEditor/index.tsx`
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