// src/config.js
export const API_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:4000'
  : 'https://tme-tax-backend-production.up.railway.app';

export const checkAPIHealth = async () => {
  try {
    const response = await fetch(`${API_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      mode: 'cors',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Health check failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Health check response:', data);
    
    return true;
  } catch (error) {
    console.error('API Health check failed:', error);
    return false;
  }
};