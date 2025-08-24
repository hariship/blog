import React, { useState, useEffect } from "react";
import { marked } from "marked";
import "./BookStyle.css";

const notebooks = [
  { name: "Journal", file: "/markdowns/chapter1.md" },
  { name: "Project Notes", file: "/markdowns/chapter2.md" },
  { name: "Ideas", file: "/markdowns/chapter3.md" },
];

const SimpleMarkdownBook = () => {
  const [selectedNotebook, setSelectedNotebook] = useState(notebooks[0]);
  const [content, setContent] = useState("Loading...");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetch(selectedNotebook.file)
      .then((response) => response.text())
      .then((text) => setContent(marked(text)))
      .catch(() => setContent("Error loading content."));
  }, [selectedNotebook]);

  return (
    <div className="book-container">
      {/* Floating Dropdown Button */}
      <div className="floating-menu">
        <button className="menu-toggle" onClick={() => setShowDropdown(!showDropdown)}>
          📚 {selectedNotebook.name} ▼
        </button>
        {showDropdown && (
          <div className="dropdown-menu">
            {notebooks.map((notebook) => (
              <div
                key={notebook.name}
                className="dropdown-item"
                onClick={() => {
                  setSelectedNotebook(notebook);
                  setShowDropdown(false);
                }}
              >
                {notebook.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notebook Content */}
      <div className="book-page">
        <div className="book-content" dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
};

export default SimpleMarkdownBook;
