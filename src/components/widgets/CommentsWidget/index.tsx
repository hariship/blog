import React, { useEffect } from "react";
import { CommentsWidgetProps } from '../../../types';
import { useTheme } from '../../../contexts/ThemeContext';
import { useSounds } from '../../../contexts/SoundContext';

const CommentsWidget: React.FC<CommentsWidgetProps> = ({ pageSlug }) => {
  const { theme } = useTheme();
  const { playKeypadBeep, playButtonSound } = useSounds();
  
  useEffect(() => {
    // Ensure the script is executed when component mounts
    const script: HTMLScriptElement = document.createElement("script");
    script.src = `${import.meta.env.VITE_BLOG_EXTRAS_URL}/widget.js`;
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
        // Apply theme to container
        if (theme === 'dark') {
          commentsContainer.style.setProperty('background-color', 'var(--color-bg-card)', 'important');
          commentsContainer.style.setProperty('color', 'var(--color-text-primary)', 'important');
        } else {
          commentsContainer.style.setProperty('background-color', 'var(--color-bg-card)', 'important');
          commentsContainer.style.setProperty('color', 'var(--color-text-primary)', 'important');
        }

        // Force re-apply theme classes to all child elements
        const allElements = commentsContainer.querySelectorAll('*');
        allElements.forEach((element) => {
          if (element instanceof HTMLElement) {
            element.style.setProperty('background-color', 'var(--color-bg-card)', 'important');
            element.style.setProperty('color', 'var(--color-text-primary)', 'important');
            element.style.setProperty('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI", system-ui, ui-sans-serif, Helvetica, Arial, sans-serif', 'important');
          }
        });

        // Target input fields
        const inputFields = commentsContainer.querySelectorAll('input[type="text"], input[type="email"], textarea');
        inputFields.forEach((input) => {
          if (input instanceof HTMLElement) {
            input.style.setProperty('background-color', 'var(--color-bg-secondary)', 'important');
            input.style.setProperty('color', 'var(--color-text-primary)', 'important');
            input.style.setProperty('border', '1px solid var(--color-border-medium)', 'important');
            input.style.setProperty('border-radius', 'var(--radius-sm)', 'important');

            // Add keyboard sound events
            input.addEventListener('keydown', (e: KeyboardEvent) => {
              if (e.key.length === 1 || e.key === 'Backspace') {
                playKeypadBeep();
              }
            });
          }
        });

        // Target submit buttons with more aggressive selectors
        const submitButtons = commentsContainer.querySelectorAll('button, input[type="submit"], .submit-button, .btn, [class*="submit"], [class*="post"], [class*="send"], [class*="button"]');
        submitButtons.forEach((button) => {
          if (button instanceof HTMLElement) {
            // Add click sound events
            button.addEventListener('click', () => {
              playButtonSound();
            });
            // Use earthy/muted colors for dark theme
            const bgColor = theme === 'dark' ? '#6b7280' : '#374151'; // slate colors
            const hoverColor = theme === 'dark' ? '#9ca3af' : '#4b5563';
            
            button.style.setProperty('background-color', bgColor, 'important');
            button.style.setProperty('background', bgColor, 'important');
            button.style.setProperty('color', '#ffffff', 'important');
            button.style.setProperty('border', `1px solid ${bgColor}`, 'important');
            button.style.setProperty('border-radius', '4px', 'important');
            button.style.setProperty('padding', '8px 16px', 'important');
            button.style.setProperty('cursor', 'pointer', 'important');
            button.style.setProperty('font-weight', '500', 'important');
          }
        });
      }
    };

    // Apply theme immediately and after potential async content loads
    const timer1 = setTimeout(applyThemeToComments, 1000);
    const timer2 = setTimeout(applyThemeToComments, 3000);
    const timer3 = setTimeout(applyThemeToComments, 5000);
    
    // Also apply when content changes (MutationObserver)
    const commentsContainer = document.getElementById('blogextras-comments');
    if (commentsContainer) {
      const observer = new MutationObserver(applyThemeToComments);
      observer.observe(commentsContainer, { childList: true, subtree: true });
      
      return () => {
        observer.disconnect();
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);  
      clearTimeout(timer3);
    };
  }, [theme]);

  return (
    <div
      id="blogextras-comments"
      data-website-id="eb663e71-296b-4665-a1c4-83fba4579887"
      data-page-slug={pageSlug || window.location.pathname}
      data-api-url={import.meta.env.VITE_BLOG_EXTRAS_URL}
      data-theme={theme}
      style={{
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    ></div>
  );
};

export default CommentsWidget;