'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { BiCoffeeTogo } from 'react-icons/bi'
import BuyMeCoffee from '../widgets/BuyMeCoffee'
import './Navbar.css'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href

  return (
    <>
      <nav className="navbar">
        {/* Mobile Hamburger Icon (Left-Aligned) */}
        <div className="menu-icon" onClick={() => setIsOpen(true)}>
          <Menu size={28} />
        </div>

        {/* Desktop Navigation (Centered) */}
        <ul className="nav-links">
          <li><Link href="/" className={isActive('/') ? 'active' : ''}>Home</Link></li>
          <li><Link href="/now" className={isActive('/now') ? 'active' : ''}>Log</Link></li>
          <li><Link href="/personal-goals" className={isActive('/personal-goals') ? 'active' : ''}>Goals</Link></li>
          {/* Apps link hidden — restore by uncommenting this line.
              <li><a href="https://apps.haripriya.org" target="_blank" rel="noopener noreferrer">Apps</a></li> */}
          {/* Coffee button hidden — restore by uncommenting this line.
              <li className="navbar-coffee-item"><BuyMeCoffee /></li> */}
        </ul>
      </nav>

      {/* Mobile Sidebar (Fixed + Smooth Transition) */}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="close-btn" onClick={() => setIsOpen(false)}>
            <X size={28} />
          </button>
        </div>
        <ul>
          <li>
            <Link
              href="/"
              className={pathname === '/' ? 'active' : ''}
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/now"
              className={pathname === '/now' ? 'active' : ''}
              onClick={() => setIsOpen(false)}
            >
              Log
            </Link>
          </li>
          <li>
            <Link
              href="/personal-goals"
              className={pathname === '/personal-goals' ? 'active' : ''}
              onClick={() => setIsOpen(false)}
            >
              Goals
            </Link>
          </li>
          {/* Apps link in mobile drawer hidden — restore by uncommenting.
          <li>
            <a
              href="https://apps.haripriya.org"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
            >
              Apps
            </a>
          </li>
          */}
          {/* Coffee link in mobile drawer hidden — restore by uncommenting.
          <li className="sidebar-coffee-link">
            <Link
              href="/coffee"
              className={pathname === '/coffee' ? 'active' : ''}
              onClick={() => setIsOpen(false)}
            >
              Buy me a coffee <BiCoffeeTogo className="sidebar-coffee-icon" />
            </Link>
          </li>
          */}
        </ul>
      </div>

      {/* Overlay to Close Sidebar on Click */}
      {isOpen && <div className="overlay" onClick={() => setIsOpen(false)}></div>}
    </>
  )
}

export default Navbar
