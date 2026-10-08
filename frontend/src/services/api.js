import axios from 'axios';

// Online (Vercel): uses VITE_API_URL. Locally: falls back to localhost.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

export default api;