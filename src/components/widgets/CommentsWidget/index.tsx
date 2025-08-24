import React, { useEffect } from "react";
import { CommentsWidgetProps } from '../../../types';
import { useTheme } from '../../../contexts/ThemeContext';

const CommentsWidget: React.FC<CommentsWidgetProps> = ({ pageSlug }) => {
  const { theme } = useTheme();
  
  useEffect(() => {
    // Ensure the script is executed when component mounts
    const script: HTMLScriptElement = document.createElement("script");
    script.src = `${process.env.REACT_APP_BLOG_EXTRAS_URL}/widget.js`;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Force theme update when BlogExtras content loads
  useEffect(() => {
    const applyThemeToComments = () => {
      const commentsContainer = document.getElementById('blogextras-comments');
      if (commentsContainer) {
        // Force re-apply theme classes to all child elements
        const allElements = commentsContainer.querySelectorAll('*');
        allElements.forEach((element) => {
          if (element instanceof HTMLElement) {
            // Remove any light theme classes and force dark theme styling
            if (theme === 'dark') {
              element.style.setProperty('background-color', 'var(--color-bg-card)', 'important');
              element.style.setProperty('color', 'var(--color-text-primary)', 'important');
            }
          }
        });

        // Specifically target submit buttons
        const submitButtons = commentsContainer.querySelectorAll('button, input[type="submit"], .submit-button, .btn, [class*="submit"], [class*="post"], [class*="send"]');
        submitButtons.forEach((button) => {
          if (button instanceof HTMLElement && theme === 'dark') {
            button.style.setProperty('background-color', 'var(--color-button-primary)', 'important');
            button.style.setProperty('background', 'var(--color-button-primary)', 'important');
            button.style.setProperty('color', 'var(--color-text-inverse)', 'important');
            button.style.setProperty('border', '2px solid var(--color-button-primary)', 'important');
            button.style.setProperty('opacity', '1', 'important');
            button.style.setProperty('visibility', 'visible', 'important');
            button.style.setProperty('display', 'inline-block', 'important');
            button.style.setProperty('cursor', 'pointer', 'important');
          }
        });
      }
    };

    // Apply theme immediately and after potential async content loads
    const timer = setTimeout(applyThemeToComments, 1000);
    
    // Also apply when content changes (MutationObserver)
    const commentsContainer = document.getElementById('blogextras-comments');
    if (commentsContainer) {
      const observer = new MutationObserver(applyThemeToComments);
      observer.observe(commentsContainer, { childList: true, subtree: true });
      
      return () => {
        observer.disconnect();
        clearTimeout(timer);
      };
    }
    
    return () => clearTimeout(timer);
  }, [theme]);

  return (
    <div
      id="blogextras-comments"
      data-website-id="eb663e71-296b-4665-a1c4-83fba4579887"
      data-page-slug={pageSlug || window.location.pathname}
      data-api-url={process.env.REACT_APP_BLOG_EXTRAS_URL}
      data-theme={theme}
      style={{
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    ></div>
  );
};

export default CommentsWidget;