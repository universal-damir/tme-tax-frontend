// src/config.js
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return process.env.REACT_APP_API_URL || 'http://localhost:3000';
  }
  return 'https://tme-tax-backend-production.up.railway.app';
};

// Base API URL
export const API_URL = getApiUrl();

// Health check function with timeout
export const checkAPIHealth = async (timeout = 5000) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${API_URL}/api/health`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('API Health check failed:', error);
    return false;
  }
};

export default API_URL;