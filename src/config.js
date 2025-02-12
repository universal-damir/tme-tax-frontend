// src/config.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Add a function to check if the API is available
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