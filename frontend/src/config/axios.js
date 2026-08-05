import axios from 'axios';

// Create a singleton axios instance
const axiosInstance = axios.create({
    baseURL: '', // Left empty so it uses the Vite proxy (/api goes to localhost:8080)
    timeout: 300000, // 300 seconds for multi-step AI generation tasks
});

// Request interceptor to attach JWT token
axiosInstance.interceptors.request.use(
    (config) => {
        // We can hook this up to our Auth state later
        const token = localStorage.getItem('jwt_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for global error handling
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            console.error('Unauthorized access - please log in');
            if (window.location.pathname !== '/login') {
                localStorage.removeItem('jwt_token');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
