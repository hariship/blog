import React, { useState } from 'react';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import './AdminLogin.css';

const AdminLogin = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Encrypt password before sending to backend
  const encryptPassword = (password) => {
    const secretKey = process.env.REACT_APP_ENCRYPTION_KEY || 'your-secret-key-change-this';
    return CryptoJS.AES.encrypt(password, secretKey).toString();
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Encrypt the password before sending
      const encryptedPassword = encryptPassword(password);
      
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/admin/auth`, {
        password: encryptedPassword,
        timestamp: Date.now() // Add timestamp for additional security
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (response.data.success) {
        // Store authentication token
        const token = response.data.token;
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminTokenExpiry', response.data.expiresAt);
        
        // Set default auth header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Clear form and call success callback
        setPassword('');
        onLoginSuccess();
      } else {
        setError('Invalid password. Please try again.');
      }

    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (error.response) {
        errorMessage = error.response.data.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h2>🔐 Admin Access</h2>
          <p>Enter password to access CMS</p>
        </div>
        
        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="input-group">
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-password-input"
              disabled={isLoading}
              autoFocus
            />
          </div>
          
          {error && (
            <div className="admin-error-message">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            className="admin-login-button"
            disabled={isLoading || !password.trim()}
          >
            {isLoading ? 'Authenticating...' : 'Access CMS'}
          </button>
        </form>
        
        <div className="admin-login-footer">
          <small>🛡️ Secure encrypted authentication</small>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;