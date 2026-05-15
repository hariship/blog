import { Metadata } from 'next'
import Image from 'next/image'
import { Navbar } from '@/components/layout'
import { ThemeToggle, SoundToggle } from '@/components/common'
import Decoded from '@/components/Decoded'
import Typewriter from '@/components/Typewriter'
import './portfolio.css'

export const metadata: Metadata = {
  title: 'Haripriya',
  description: 'Engineer in Bangalore. Personal site of Haripriya.',
  openGraph: {
    title: 'Haripriya',
    description: 'Engineer in Bangalore.',
    url: 'https://haripriya.org',
    siteName: 'Haripriya',
    type: 'website',
    images: [{ url: 'https://blog.haripriya.org/logo512.png', width: 512, height: 512 }],
  },
}

export default function PortfolioPage() {
  return (
    <>
      <Navbar />
      <main className="portfolio-container">

        {/* Hero */}
        <section className="portfolio-hero">
          <div className="portfolio-hero-avatar">
            <Image
              src="/logo512.png"
              alt="Haripriya"
              width={512}
              height={512}
              priority
            />
          </div>
          <div className="portfolio-hero-text">
            <span className="portfolio-code">
              <Decoded text="SYS·INTRO" />
            </span>
            <h1 className="portfolio-name">
              <Decoded text="Haripriya" durationMs={700} />
            </h1>
            <p className="portfolio-tagline">
              <Decoded text="Engineer · Bangalore" durationMs={900} />
            </p>
            <div className="portfolio-hero-controls">
              <SoundToggle />
              <ThemeToggle />
            </div>
          </div>
        </section>

        {/* Profile */}
        <section className="portfolio-section">
          <header className="portfolio-section-head">
            <span className="portfolio-section-name">Profile</span>
            <span className="portfolio-section-code">01</span>
          </header>
          <ul className="portfolio-profile">
            <li>
              <span className="portfolio-profile-label">Role</span>
              <span className="portfolio-profile-value">
                <Typewriter text="Engineer ++" speedMs={20} startDelayMs={300} caret={false} />
              </span>
            </li>
            <li>
              <span className="portfolio-profile-label">Based in</span>
              <span className="portfolio-profile-value">
                <Typewriter text="Bangalore, India" speedMs={20} startDelayMs={700} caret={false} />
              </span>
            </li>
            <li>
              <span className="portfolio-profile-label">Currently</span>
              <span className="portfolio-profile-value">
                <Typewriter text="Building small tools and writing notes." speedMs={20} startDelayMs={1100} caret={false} />
              </span>
            </li>
          </ul>
        </section>

        {/* Pulled toward */}
        <section className="portfolio-section">
          <header className="portfolio-section-head">
            <span className="portfolio-section-name">Pulled toward</span>
            <span className="portfolio-section-code">02</span>
          </header>
          <div className="portfolio-prose">
            <ul className="portfolio-about-list">
              <li><Typewriter text="An afternoon to sketch or write" speedMs={18} startDelayMs={200} caret={false} /></li>
              <li><Typewriter text="A problem I can turn over for days" speedMs={18} startDelayMs={750} caret={false} /></li>
              <li><Typewriter text="Teaching what I just figured out" speedMs={18} startDelayMs={1350} caret={false} /></li>
              <li><Typewriter text="Good science fiction" speedMs={18} startDelayMs={1950} caret={false} /></li>
              <li><Typewriter text="Tech that explains itself when asked" speedMs={18} startDelayMs={2400} caret={false} /></li>
              <li><Typewriter text="Software written for the person using it" speedMs={18} startDelayMs={3100} caret={false} /></li>
              <li><Typewriter text="A trip where I forget my phone is in my bag" speedMs={18} startDelayMs={3900} caret={false} /></li>
            </ul>
            <p className="portfolio-about-closer">
              <Typewriter
                text="I'm not very good at hurry, and I'm trying to stay that way."
                speedMs={18}
                startDelayMs={4800}
                caret={false}
              />
            </p>
          </div>
        </section>

        {/* Elsewhere */}
        <section className="portfolio-section">
          <header className="portfolio-section-head">
            <span className="portfolio-section-name">Elsewhere</span>
            <span className="portfolio-section-code">03</span>
          </header>
          <ul className="portfolio-elsewhere">
            <li>
              <a href="https://blog.haripriya.org" className="portfolio-link">
                <span className="portfolio-link-name">Blog</span>
                <span className="portfolio-link-host">blog.haripriya.org</span>
              </a>
            </li>
            <li>
              <a href="https://blog.haripriya.org/now" className="portfolio-link">
                <span className="portfolio-link-name">Personal Log</span>
                <span className="portfolio-link-host">blog.haripriya.org/now</span>
              </a>
            </li>
            <li>
              <a href="https://apps.haripriya.org" className="portfolio-link">
                <span className="portfolio-link-name">Apps</span>
                <span className="portfolio-link-host">apps.haripriya.org</span>
              </a>
            </li>
            <li>
              <a href="https://inkhouse.haripriya.org" className="portfolio-link">
                <span className="portfolio-link-name">InkHouse</span>
                <span className="portfolio-link-host">inkhouse.haripriya.org</span>
              </a>
            </li>
            <li>
              <a href="https://github.com/hariship" className="portfolio-link">
                <span className="portfolio-link-name">GitHub</span>
                <span className="portfolio-link-host">@hariship</span>
              </a>
            </li>
            <li>
              <a href="mailto:mailtoharipriyas@gmail.com" className="portfolio-link">
                <span className="portfolio-link-name">Email</span>
                <span className="portfolio-link-host">mailtoharipriyas@gmail.com</span>
              </a>
            </li>
          </ul>
        </section>

      </main>
    </>
  )
}
