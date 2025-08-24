import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ManageSubscription.css';

const ManageSubscription = () => {
  const { email } = useParams();
  const navigate = useNavigate();
  const decodedEmail = email ? decodeURIComponent(email) : '';
  
  const [subscriber, setSubscriber] = useState<any>(null);
  const [name, setName] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [frequency, setFrequency] = useState('weekly');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch subscriber data and available categories when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch available categories
        const categoriesResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/rss-feed`);
        const categoriesData = await categoriesResponse.json();
        const uniqueCategories = [...new Set(categoriesData.map((item: any) => item.category).filter(Boolean))] as string[];
        setAvailableCategories(uniqueCategories);
        
        // Only fetch subscriber if email is provided
        if (decodedEmail) {
          const subscriberResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/subscriber/${decodedEmail}`);
          const subscriberData = await subscriberResponse.json();
          
          if (subscriberData.success && subscriberData.subscriber) {
            const sub = subscriberData.subscriber;
            setSubscriber(sub);
            setName(sub.name || '');
            setCategories(sub.categories || []);
            setFrequency(sub.frequency || 'weekly');
          } else {
            setMessage('Subscriber not found. Please check your email address or subscribe first.');
            setMessageType('error');
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setMessage('Failed to load your subscription details. Please try again later.');
        setMessageType('error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [decodedEmail]);

  const handleCategoryChange = (category: string) => {
    if (categories.includes(category)) {
      setCategories(categories.filter(c => c !== category));
    } else {
      setCategories([...categories, category]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/update-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: decodedEmail,
          name,
          categories: categories.length > 0 ? categories : ['all'],
          frequency
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Your subscription preferences have been updated successfully!');
        setMessageType('success');
      } else {
        setMessage(data.message || 'Failed to update subscription. Please try again.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      setMessage('An error occurred. Please try again later.');
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (window.confirm('Are you sure you want to unsubscribe from all newsletters?')) {
      try {
        setIsSubmitting(true);
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/unsubscribe/${decodedEmail}`);
        const data = await response.json();
        
        if (response.ok) {
          setMessage('You have been unsubscribed successfully. Sorry to see you go!');
          setMessageType('success');
          // Clear subscriber data since they're now unsubscribed
          setSubscriber(null);
        } else {
          setMessage(data.message || 'Failed to unsubscribe. Please try again.');
          setMessageType('error');
        }
      } catch (error) {
        console.error('Error unsubscribing:', error);
        setMessage('An error occurred. Please try again later.');
        setMessageType('error');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="manage-subscription-container">
        <div className="loading-spinner">Loading your subscription details...</div>
      </div>
    );
  }

  return (
    <div className="manage-subscription-container">
      <div className="manage-subscription-header">
        <h1>Manage Your Subscription</h1>
        {subscriber && subscriber.status === 'active' ? (
          <p className="subscription-status active">Your subscription is currently active</p>
        ) : (
          <p className="subscription-status inactive">Your subscription is currently inactive</p>
        )}
      </div>

      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      {subscriber ? (
        <div className="subscription-form-container">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={decodedEmail}
                disabled
                className="disabled-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
            
            {/* <div className="form-group">
              <label>Categories you're interested in:</label>
              <div className="category-checkboxes">
                <div className="category-checkbox">
                  <input
                    type="checkbox"
                    id="all-categories"
                    checked={categories.length === 0 || categories.includes('all')}
                    onChange={() => setCategories(['all'])}
                  />
                  <label htmlFor="all-categories">All Categories</label>
                </div>
                
                {availableCategories.map((category, index) => (
                  <div className="category-checkbox" key={index}>
                    <input
                      type="checkbox"
                      id={`category-${index}`}
                      checked={categories.includes(category)}
                      onChange={() => handleCategoryChange(category)}
                      disabled={categories.includes('all')}
                    />
                    <label htmlFor={`category-${index}`}>{category}</label>
                  </div>
                ))}
              </div>
            </div> */}
            
            {/* <div className="form-group">
              <label htmlFor="frequency">Email Frequency</label>
              <select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div> */}
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="update-button" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update'}
              </button>
              
              <button 
                type="button" 
                className="unsubscribe-button" 
                onClick={handleUnsubscribe}
                disabled={isSubmitting}
              >
                Unsubscribe
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="subscribe-prompt">
          <p>You are not currently subscribed to our newsletter or have already unsubscribed.</p>
          <button 
            onClick={() => navigate('/')} 
            className="subscribe-button"
          >
            Go to Homepage
          </button>
        </div>
      )}
    </div>
  );
};

export default ManageSubscription;