// Books.tsx
import React from 'react';
import './BookStyle.css';

const Books: React.FC = () => {
  return (
    <div>
      <div className="books-container">
        <iframe
          src={process.env.REACT_APP_NOTION_HERO_BOOKS_EMBED}
          className="books-iframe"
          title="Books and Categories"
        />
      </div>    
    </div>
  );
};

export default Books;