import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  withXSRFToken: true, // send XSRF-TOKEN cookie as header even cross-origin
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

// Sanctum SPA auth requires a CSRF cookie before any state-changing request
export async function ensureCsrfCookie() {
  await api.get("/sanctum/csrf-cookie");
}

export async function registerUser({ name, email, password, password_confirmation, referral_code }) {
  await ensureCsrfCookie();
  const { data } = await api.post("/api/auth/register", {
    name, email, password, password_confirmation,
    referral_code: referral_code || undefined, // omit entirely if blank
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