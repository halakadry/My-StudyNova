import axios from 'axios';
import { auth } from './firebase';

// Online (Vercel): uses VITE_API_URL. Locally: falls back to localhost.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Send the Firebase login token with every request, so the server knows who is asking.
// getIdToken() refreshes the token automatically when it expires.
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;