import axios from 'axios';

// In development, requests go through Vite's proxy (no CORS issues).
// In production, VITE_API_URL must be set to the deployed backend URL.
const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 120000, // 2 minutes for normal requests
    withCredentials: true, // Send cookies (auth cookie support)
});

// ── Request interceptor: attach Bearer token ──────────────────────────────────
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response interceptor: handle auth errors globally ─────────────────────────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ECONNABORTED') {
            // Timeout — let callers handle this
            return Promise.reject(error);
        }

        if (error.response?.status === 401 || error.response?.status === 403) {
            const detail = error.response?.data?.detail || '';
            // Only auto-logout on auth/expiry errors, not admin 403s
            const isAuthError =
                detail.includes('expired') ||
                detail.includes('credentials') ||
                detail.includes('inactive') ||
                error.response?.status === 401;

            if (isAuthError) {
                localStorage.removeItem('token');
                localStorage.removeItem('user_data');
                // Redirect to login if not already there
                if (
                    !window.location.pathname.includes('/login') &&
                    !window.location.pathname.includes('/admin')
                ) {
                    window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error);
    }
);

export default api;
