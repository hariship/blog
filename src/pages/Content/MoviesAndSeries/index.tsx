// MoviesAndCategories.tsx
import React from 'react';
import './MoviesAndSeries.css';

const MoviesAndSeries: React.FC = () => {
  return (
    <div>
      <div className="movies-container">
        <iframe
          src={process.env.REACT_APP_NOTION_HERO_MOVIES_EMBED}
          className="movies-iframe"
          title="Movies and Categories"
        />
      </div>    
    </div>
  );
};

export default MoviesAndSeries;