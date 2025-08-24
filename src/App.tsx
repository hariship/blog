import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RSSFeed from './pages/Blog/RSSFeed';
import Post from './pages/Blog/Post';
import MoviesAndSeries from './pages/Content/MoviesAndSeries';
import Books from './pages/Content/Books';
import NavBar from './components/layout/Navbar';
import PersonalGoals from './pages/Content/PersonalGoals';
import ManageSubscription from './pages/Subscribe/ManageSubscription';
import CMSDashboard from './pages/Admin/CMSDashboard';

const App: React.FC = () => {
  return (
    <Router>
       <NavBar />
      <Routes>
        <Route path="/" element={<RSSFeed />} />
        <Route path="/post/:title" element={<Post />} />
        <Route path="/movies-and-series" element={<MoviesAndSeries />} />
        <Route path="/books" element={<Books />} />
        <Route path="/manage-subscription/:email" element={<ManageSubscription />} />
        <Route path="/personal-goals" element={<PersonalGoals />} /> {/* New Route */}
        <Route path="/admin/cms" element={<CMSDashboard />} />
      </Routes>
    </Router>
  );
};

export default App;
