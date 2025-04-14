import React, { useState } from 'react';
import './Subscribe.css';

const Subscribe = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [subscribeCategories, setSubscribeCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [availableCategories, setAvailableCategories] = useState([]);

  // Fetch available categories when component mounts
  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('https://api.haripriya.org/rss-feed');
        const data = await response.json();
        // Extract unique categories
        const categories = [...new Set(data.map(item => item.category))];
        setAvailableCategories(categories);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    
    fetchCategories();
  }, []);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // Reset form fields
    setMessage('');
    setMessageType('');
  };

  const handleCategoryChange = (category) => {
    if (subscribeCategories.includes(category)) {
      setSubscribeCategories(subscribeCategories.filter(c => c !== category));
    } else {
      setSubscribeCategories([...subscribeCategories, category]);
    }
  };

  const validateEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSubmit = async (e) => {
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
      const response = await fetch('https://api.haripriya.org/subscribe', {
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
      <button onClick={openModal} className="subscribe-button">
        Subscribe
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