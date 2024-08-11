// MoviesAndCategories.js
import React from 'react';

const Books = () => {
  return (
    <div>
      <div style ={containerStyle}>
      <iframe
        src="https://e.notionhero.io/e1/p/9ad5bf5-fe66aa5863eb8a441a15f5aac7b865a"
        style={iframeStyle}
        title="Movies and Categories"
      />
    </div>    
    </div>
  );
};

const containerStyle = {
    width: '100%',
    height: '100vh',
    minHeight: '600px',
    padding: '0',
    border: '2px solid #ccc',
    borderRadius: '10px',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };
  
  const iframeStyle = {
    width: '100%',
    height: '100vh',
    minHeight: '600px',
    border: 'none',
    position: 'absolute',
    top: 0,
    left: 0,
  };
  

export default Books;