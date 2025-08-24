import React, { useState,useEffect } from 'react';
import AdminLogin from '../AdminLogin';
import CMSPostEditor from '../CMSPostEditor';

const CMSDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  useEffect(() => {
    const token: string | null = localStorage.getItem('adminToken');
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
};

export default CMSDashboard;
