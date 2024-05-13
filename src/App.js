import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RSSFeed from './RSSFeed';
import Post from './Post';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RSSFeed />} />
        <Route path="/post/:slug" element={<Post />} />
      </Routes>
    </Router>
  );
};

export default App;
