import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  withXSRFToken: true, // <-- add this line
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

// Sanctum SPA auth requires a CSRF cookie before any state-changing request
export async function ensureCsrfCookie() {
  await api.get("/sanctum/csrf-cookie");
}

export async function registerUser({ name, email, password, password_confirmation }) {
  await ensureCsrfCookie();
  const { data } = await api.post("/api/auth/register", {
    name, email, password, password_confirmation,
  });
  return data.user;
}

export async function loginUser({ email, password }) {
  await ensureCsrfCookie();
  const { data } = await api.post("/api/auth/login", { email, password });
  return data.user;
}

export async function logoutUser() {
  await api.post("/api/auth/logout");
}

export async function fetchCurrentUser() {
  const { data } = await api.get("/api/auth/me");
  return data.user;
}

export function googleLoginUrl() {
  return `${API_BASE}/api/auth/google/redirect`;
}