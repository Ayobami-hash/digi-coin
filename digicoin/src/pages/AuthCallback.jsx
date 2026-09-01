import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const { refresh } = useAuth();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setFailed(true);
      return;
    }

    localStorage.setItem("auth_token", token);

    // Strip the token out of the visible URL immediately so it doesn't
    // linger in the address bar or browser history.
    window.history.replaceState({}, "", "/auth/callback");

    refresh().then(() => {
      window.history.pushState({}, "", "/");
      window.location.reload();
    });
  }, [refresh]);

  if (failed) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#63627A", fontFamily: "'Work Sans', sans-serif" }}>
        Google sign-in didn't complete. Please try again.
        <div style={{ marginTop: 16 }}>
          <a href="/">Back to sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, textAlign: "center", color: "#63627A", fontFamily: "'Work Sans', sans-serif" }}>
      Signing you in…
    </div>
  );
}