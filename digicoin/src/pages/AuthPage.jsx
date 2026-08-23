import { useState, useEffect } from "react";
import { Coins, Mail, Lock, User as UserIcon, Gift } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { googleLoginUrl } from "../lib/api";

export default function AuthPage() {
  const { login, register, error, setError } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", password_confirmation: "", referral_code: "",
  });

  // If the link has ?ref=<id>, prefill it and jump straight to the
  // register tab — someone arriving via a referral link almost
  // certainly wants to sign up, not log in.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setForm((f) => ({ ...f, referral_code: ref }));
      setMode("register");
    }
  }, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }
    } catch {
      // error already set in context
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Work+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .dc-btn {
          font-family: 'Work Sans', sans-serif;
          font-weight: 600;
          font-size: 14px;
          border: none;
          border-radius: 8px;
          padding: 11px 18px;
          cursor: pointer;
          transition: transform 0.12s ease, opacity 0.12s ease;
        }
        .dc-btn:active { transform: scale(0.97); }
        .dc-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .dc-btn-primary { background: #33346B; color: #F3F2FA; }
        .dc-btn-primary:hover { opacity: 0.92; }
        .dc-btn-ghost { background: transparent; color: #33346B; border: 1.5px solid #33346B; }
        .dc-btn-ghost:hover { background: rgba(51,52,107,0.07); }
        .dc-input {
          font-family: 'Work Sans', sans-serif;
          font-size: 15px;
          padding: 11px 14px 11px 40px;
          border-radius: 8px;
          border: 1.5px solid #D3D3DE;
          background: #F7F7FB;
          color: #1C1B1F;
          width: 100%;
          outline: none;
          transition: border-color 0.12s ease;
        }
        .dc-input:focus { border-color: #33346B; }
        .dc-input::placeholder { color: #8C8B99; }
        .dc-field { position: relative; margin-bottom: 12px; }
        .dc-field svg { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #8C8B99; }
      `}</style>

      <div style={styles.card}>
        <div style={styles.brandRow}>
          <Coins size={22} color="#C99A3D" strokeWidth={2} />
          <span style={styles.wordmark}>DigiCoin</span>
        </div>

        <h1 style={styles.h1}>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p style={styles.subtitle}>
          {mode === "login" ? "Sign in to keep farming your referrals." : "Set up your wallet in a few seconds."}
        </p>

        {mode === "register" && form.referral_code && (
          <div style={styles.referralBanner}>
            <Gift size={15} color="#33346B" />
            <span>You were invited by referral code <strong>{form.referral_code}</strong></span>
          </div>
        )}

        <button
          type="button"
          className="dc-btn dc-btn-ghost"
          onClick={() => { window.location.href = googleLoginUrl(); }}
          style={{ width: "100%", marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.5 0-14 4.1-17.7 10.7z"/><path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.4 27 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.9 39.9 16.4 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.6 5.4C41.6 35.7 44 30.2 44 24c0-1.3-.1-2.7-.4-3.5z"/></svg>
          Continue with Google
        </button>

        <div style={styles.dividerRow}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="dc-field">
              <UserIcon size={16} />
              <input className="dc-input" placeholder="Your name" value={form.name} onChange={update("name")} required />
            </div>
          )}
          <div className="dc-field">
            <Mail size={16} />
            <input className="dc-input" type="email" placeholder="Email" value={form.email} onChange={update("email")} required />
          </div>
          <div className="dc-field">
            <Lock size={16} />
            <input className="dc-input" type="password" placeholder="Password" value={form.password} onChange={update("password")} required />
          </div>
          {mode === "register" && (
            <>
              <div className="dc-field">
                <Lock size={16} />
                <input className="dc-input" type="password" placeholder="Confirm password" value={form.password_confirmation} onChange={update("password_confirmation")} required />
              </div>
              <div className="dc-field">
                <Gift size={16} />
                <input
                  className="dc-input"
                  placeholder="Referral code (optional)"
                  value={form.referral_code}
                  onChange={update("referral_code")}
                />
              </div>
            </>
          )}

          {error && <p style={styles.errorText}>{error}</p>}

          <button className="dc-btn dc-btn-primary" type="submit" disabled={submitting} style={{ width: "100%", marginTop: 6 }}>
            {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p style={styles.switchText}>
          {mode === "login" ? "New to DigiCoin?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            style={styles.switchLink}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "'Work Sans', sans-serif",
    background: "#EDEEF2",
    color: "#1C1B1F",
    padding: "40px 20px",
    minHeight: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    background: "#F7F7FB",
    border: "1px solid #DEDDE8",
    borderRadius: 14,
    padding: "28px 26px",
    maxWidth: 400,
    width: "100%",
  },
  brandRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 18 },
  wordmark: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 19, letterSpacing: "-0.01em" },
  h1: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 24, margin: "6px 0 6px", lineHeight: 1.2 },
  subtitle: { fontSize: 14, color: "#63627A", margin: 0, lineHeight: 1.5 },
  referralBanner: {
    display: "flex", alignItems: "center", gap: 8, background: "#E6E5F0",
    border: "1px solid #DEDDE8", borderRadius: 8, padding: "10px 12px",
    fontSize: 13, color: "#33346B", marginTop: 14,
  },
  dividerRow: { display: "flex", alignItems: "center", gap: 10, margin: "18px 0 14px" },
  dividerLine: { flex: 1, height: 1, background: "#DEDDE8" },
  dividerText: { fontSize: 12, color: "#8C8B99" },
  errorText: { fontSize: 13, color: "#B5502F", margin: "4px 0 10px" },
  switchText: { fontSize: 13, color: "#63627A", textAlign: "center", marginTop: 18 },
  switchLink: { background: "none", border: "none", color: "#33346B", fontWeight: 600, cursor: "pointer", fontSize: 13, padding: 0 },
};