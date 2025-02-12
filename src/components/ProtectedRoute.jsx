// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const loginTime = parseInt(localStorage.getItem('loginTime') || '0');
  const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // Check if session has expired
  if (isAuthenticated && Date.now() - loginTime > SESSION_DURATION) {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('loginTime');
    return <Navigate to="/login" replace />;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;