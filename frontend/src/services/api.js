import axios from 'axios';

// In development, requests go through Vite's proxy (no CORS issues).
// In production, VITE_API_URL must be set to the deployed backend URL.
const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 300000 // 5 minutes for generation timeouts
});

// ── Response interceptor: handle errors globally ─────────────────────────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ECONNABORTED') {
            return Promise.reject(error);
        }
        return Promise.reject(error);
    }
);

export default api;
