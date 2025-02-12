// src/config.js
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-api-url.com'
  : 'http://localhost:3000';

export default API_URL;