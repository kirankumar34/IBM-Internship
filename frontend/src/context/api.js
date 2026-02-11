import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        try {
            const user = localStorage.getItem('user');
            if (user) {
                const parsedUser = JSON.parse(user);
                if (parsedUser && parsedUser.token) {
                    config.headers.Authorization = `Bearer ${parsedUser.token}`;
                }
            }
        } catch (error) {
            console.error('API Interceptor Error:', error);
            // Optionally clear storage if corrupted
            // localStorage.removeItem('user');
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handles 401s
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('user');
            // Redirect to login if not already there
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
