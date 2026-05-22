import axios from 'axios';

const baseURL =
  typeof window === 'undefined'
    ? process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL
    : process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: baseURL || 'http://localhost:3001/api/v1',
  withCredentials: true,
});

export default api;
