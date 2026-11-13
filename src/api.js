import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to attach the token
// Public, user-independent reads. Sending no token on these lets the CDN serve them from cache.
const PUBLIC_GET = [/^\/?items\/?(\?|$)/, /^\/?items\/stats/, /^\/?items\/match\//, /^\/?auth\/leaderboard/];

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    const isPublic = (config.method || "get") === "get" && PUBLIC_GET.some((re) => re.test(config.url || ""));
    if (token && !isPublic) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
