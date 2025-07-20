import React, { useState,useEffect } from 'react';
import AdminLogin from './AdminLogin';
import CMSPostEditor from './CMSPostEditor';

export default function CMSDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) setIsAuthenticated(true);
  }, []);
  
  return (
    <div>
      {isAuthenticated ? (
        <CMSPostEditor />
      ) : (
        <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />
      )}
    </div>
  );
}
