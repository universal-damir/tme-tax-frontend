// src/config.js
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://taxgpt.netlify.app'
  : 'http://localhost:3000';

export default API_URL;