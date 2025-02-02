import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const NavBar = () => {
  return (
    <nav className="navbar">
      <Link to="/" style={{ margin: '0 10px' }}>Home</Link>
      <Link to="/personal-goals">Personal Goals</Link>
      <Link to="/books" style={{ margin: '0 10px' }}>Books</Link>
      <Link to="/movies-and-series" style={{ margin: '0 10px' }}>Movies & Series</Link>
    </nav>
  );
};

export default NavBar;