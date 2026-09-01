import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout if a token expires/gets revoked server-side
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
    }
    return Promise.reject(error);
  }
);

export async function registerUser({ name, email, password, password_confirmation, referral_code }) {
  const { data } = await api.post("/api/auth/register", {
    name, email, password, password_confirmation,
    referral_code: referral_code || undefined,
  });
  localStorage.setItem("auth_token", data.token);
  return data.user;
}

export async function loginUser({ email, password }) {
  const { data } = await api.post("/api/auth/login", { email, password });
  localStorage.setItem("auth_token", data.token);
  return data.user;
}

export async function logoutUser() {
  try {
    await api.post("/api/auth/logout");
  } finally {
    localStorage.removeItem("auth_token");
  }
}

export async function fetchCurrentUser() {
  const { data } = await api.get("/api/auth/me");
  return data.user;
}

export function googleLoginUrl() {
  return `${API_BASE}/api/auth/google/redirect`;
}