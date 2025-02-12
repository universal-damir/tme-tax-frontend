// src/config.js
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://tme-tax-backend-production.up.railway.app'
  : 'http://localhost:3000';

export default API_URL;