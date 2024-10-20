import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RSSFeed from './RSSFeed';
import Post from './Post';
import MoviesAndSeries from './MoviesAndSeries';
import Books from './Books';
import NavBar from './Navbar';

const App = () => {
  return (
    <Router>
       <NavBar />
      <Routes>
        <Route path="/" element={<RSSFeed />} />
        <Route path="/post/:title" element={<Post />} />
        <Route path="/movies-and-series" element={<MoviesAndSeries />} />
        <Route path="/books" element={<Books />} />
      </Routes>
    </Router>
  );
};

export default App;
