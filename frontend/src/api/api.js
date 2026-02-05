import axios from "axios";
const api = axios.create({
    baseURL: "http://localhost:3000/",
});

// Attach token automatically
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token"); // or sessionStorage
    console.log("Token being sent:", token);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
