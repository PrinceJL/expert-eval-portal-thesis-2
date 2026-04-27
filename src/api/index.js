import axios from "axios";
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Attach token automatically
api.interceptors.request.use((config) => {
    // Use sessionStorage to match AuthContext storage
    const token = sessionStorage.getItem("accessToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses globally for this axios instance
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Dispatch event to trigger logout in AuthContext
            window.dispatchEvent(new Event('auth:logout'));
        }
        return Promise.reject(error);
    }
);

export default api;
