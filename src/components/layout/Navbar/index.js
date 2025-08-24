import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import './Navbar.css';

const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation(); // Get current route

  return (
    <>
      <nav className="navbar">
        {/* Mobile Hamburger Icon (Left-Aligned) */}
        <div className="menu-icon" onClick={() => setIsOpen(true)}>
          <Menu size={28} />
        </div>

        {/* Desktop Navigation (Centered) */}
        <ul className="nav-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/personal-goals">Personal Goals</Link></li>
          <li><Link to="/books">Books</Link></li>
          <li><Link to="/movies-and-series">Movies & Series</Link></li>
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
          <li><Link to="/" className={location.pathname === "/" ? "active" : ""} onClick={() => setIsOpen(false)}>Home</Link></li>
          <li><Link to="/personal-goals" className={location.pathname === "/personal-goals" ? "active" : ""} onClick={() => setIsOpen(false)}>Personal Goals</Link></li>
          <li><Link to="/books" className={location.pathname === "/books" ? "active" : ""} onClick={() => setIsOpen(false)}>Books</Link></li>
          <li><Link to="/movies-and-series" className={location.pathname === "/movies-and-series" ? "active" : ""} onClick={() => setIsOpen(false)}>Movies & Series</Link></li>
        </ul>
      </div>
      {/* Overlay to Close Sidebar on Click */}
      {isOpen && <div className="overlay" onClick={() => setIsOpen(false)}></div>}
    </>
  );
};

export default NavBar;