import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchCurrentUser, loginUser, registerUser, logoutUser } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("auth_token");

    // No token stored — skip the /me call entirely, nothing to validate.
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const u = await fetchCurrentUser();
      setUser(u);
    } catch (e) {
      // Token is invalid/expired/revoked — clear it so we don't keep
      // sending a dead token on every subsequent request.
      localStorage.removeItem("auth_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  async function login(credentials) {
    setError("");
    try {
      const u = await loginUser(credentials);
      setUser(u);
      return u;
    } catch (e) {
      setError(e.response?.data?.message || "Login failed");
      throw e;
    }
  }

  async function register(fields) {
    setError("");
    try {
      const u = await registerUser(fields);
      setUser(u);
      return u;
    } catch (e) {
      const msg = e.response?.data?.errors
        ? Object.values(e.response.data.errors).flat().join(" ")
        : e.response?.data?.message || "Registration failed";
      setError(msg);
      throw e;
    }
  }

  async function logout() {
    await logoutUser();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, setError, login, register, logout, refresh: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}