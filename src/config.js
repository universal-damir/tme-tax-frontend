// src/config.js
const getApiUrl = () => {
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:3000';
    }
    return process.env.REACT_APP_API_URL || 'https://your-railway-url.railway.app';
  };
  
  const API_URL = getApiUrl();
  
  export const checkAPIHealth = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      return response.ok;
    } catch (error) {
      console.error('API Health check failed:', error);
      return false;
    }
  };
  
  export default API_URL;