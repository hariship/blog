import React, { useState } from 'react';
import { useSounds } from '../../../contexts/SoundContext';
import './Subscribe.css';

const Subscribe: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [subscribeCategories, setSubscribeCategories] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<string>('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);
  const { playButtonSound, playKeypadBeep } = useSounds();
 
  // Fetch available categories when component mounts
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 667);
    };
  
    checkMobile(); // check on mount
    window.addEventListener('resize', checkMobile); // update on resize
  
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/rss-feed`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const categories = [...new Set(data.map((item: any) => item.category))] as string[];
        setAvailableCategories(categories);
      } catch (error) {
        console.warn('Could not fetch categories, using default:', error);
        setAvailableCategories(['all']);
      }
    };
  
    fetchCategories();
  
    return () => {
      window.removeEventListener('resize', checkMobile); // cleanup
    };
  }, []);
  

  const openModal = () => {
    playButtonSound();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // Reset form fields
    setMessage('');
    setMessageType('');
  };

  const handleCategoryChange = (category: string) => {
    if (subscribeCategories.includes(category)) {
      setSubscribeCategories(subscribeCategories.filter(c => c !== category));
    } else {
      setSubscribeCategories([...subscribeCategories, category]);
    }
  };

  const validateEmail = (email: string): boolean => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    if (!validateEmail(email)) {
      setMessage('Please enter a valid email address');
      setMessageType('error');
      return;
    }

    // Validate name
    if (name.trim() === '') {
      setMessage('Please enter your name');
      setMessageType('error');
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name,
          categories: subscribeCategories.length > 0 ? subscribeCategories : ['all'],
          
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Successfully subscribed!');
        setMessageType('success');
        // Reset form fields on success
        setEmail('');
        setName('');
        setSubscribeCategories([]);
        
        // Close modal after 2 seconds on success
        setTimeout(() => {
          closeModal();
        }, 2000);
      } else {
        setMessage(data.message || 'Failed to subscribe. Please try again.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      setMessage('An error occurred. Please try again later.');
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="subscribe-container">
      <button className={`subscribe-button ${isMobile ? 'mobile-button' : ''}`} onClick={openModal}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

      {isModalOpen && (
        <div className="subscribe-modal-overlay">
          <div className="subscribe-modal">
            <div className="subscribe-modal-header">
              <h2>Subscribe to Newsletter</h2>
              <button className="close-modal-button" onClick={closeModal}>
                &times;
              </button>
            </div>
            
            <div className="subscribe-modal-content">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key.length === 1 || e.key === 'Backspace') {
                        playKeypadBeep();
                      }
                    }}
                    placeholder="Enter your name"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key.length === 1 || e.key === 'Backspace') {
                        playKeypadBeep();
                      }
                    }}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                
                {/* <div className="form-group">
                  <label>Categories you want to subscribe to:</label>
                  <div className="category-checkboxes">
                    <div className="category-checkbox">
                      <input
                        type="checkbox"
                        id="all-categories"
                        checked={subscribeCategories.length === 0}
                        onChange={() => setSubscribeCategories([])}
                      />
                      <label htmlFor="all-categories">All Categories</label>
                    </div>
                    
                    {availableCategories.map((category, index) => (
                      <div className="category-checkbox" key={index}>
                        <input
                          type="checkbox"
                          id={`category-${index}`}
                          checked={subscribeCategories.includes(category)}
                          onChange={() => handleCategoryChange(category)}
                        />
                        <label htmlFor={`category-${index}`}>{category}</label>
                      </div>
                    ))}
                  </div>
                </div> */}
                
                {message && (
                  <div className={`message ${messageType}`}>
                    {message}
                  </div>
                )}
                
                <div className="form-actions">
                  <button
                    type="submit"
                    className="submit-button"
                    disabled={isSubmitting}
                    onClick={() => playButtonSound()}
                  >
                    {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscribe;