import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // Vite proxy handles this
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const user = localStorage.getItem('user');
        if (user) {
            const token = JSON.parse(user).token;
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
