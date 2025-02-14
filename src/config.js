// src/config.js
export const API_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000'
  : 'https://tme-tax-backend-production.up.railway.app';

export const checkAPIHealth = async () => {
  try {
    const response = await fetch(`${API_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      mode: 'cors',
    });
    
    console.log('Health check response:', {
      status: response.status,
      ok: response.ok
    });
    
    return response.ok;
  } catch (error) {
    console.error('API Health check failed:', error);
    return false;
  }
};