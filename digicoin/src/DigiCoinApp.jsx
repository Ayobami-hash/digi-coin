import { useState, useEffect } from "react";
import { Coins, Copy, Check, UserPlus, Wallet, Sparkles, TrendingUp, LogOut } from "lucide-react";
import UpgradePlan from "./UpgradePlan";
import { useAuth } from "./context/AuthContext";
import TaskRewardBox from "./components/TaskRewardBox";
import ReferralRewardBox from "./components/ReferralRewardBox";
import ReferralListSection from "./components/ReferralListSection";
import { fetchTaskStatus, fetchReferralStatus } from "./lib/rewardsApi";
import { api } from "./lib/api";

const TIERS = [
  { threshold: 1, reward: 50, label: "First referral" },
  { threshold: 3, reward: 200, label: "Rising farmer" },
  { threshold: 5, reward: 500, label: "Power farmer" },
  { threshold: 10, reward: 1500, label: "DigiCoin Elite" },
];

function nextTier(count) {
  return TIERS.find((t) => count < t.threshold) || null;
}

export default function DigiCoinApp() {
  // `user` is the authenticated Laravel user (via Sanctum bearer token,
  // attached automatically by the `api` Axios instance's interceptor).
  const { user, logout } = useAuth();

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [showUpgradePlan, setShowUpgradePlan] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [tasksLocked, setTasksLocked] = useState(true);

  const [monthTaskTotal, setMonthTaskTotal] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [referralTotal, setReferralTotal] = useState(0);

  async function loadSummary() {
    try {
      const [taskStatus, referralStatus] = await Promise.all([
        fetchTaskStatus(),
        fetchReferralStatus(),
      ]);
      setMonthTaskTotal(taskStatus.availableBalance || 0);
      setReferralCount(referralStatus.referralCount || 0);
      setReferralTotal(referralStatus.availableBalance || 0);
    } catch (err) {
      console.error("Error loading reward summary:", err);
    }
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await api.get(`/api/user/${user.id}/plan`);
        setCurrentPlan(data.currentPlan);
        setTasksLocked(Boolean(data.tasksLocked));
      } catch (err) {
        console.error("Error fetching plan:", err);
      }
    })();
    loadSummary();
  }, [user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    const canceled = params.get("canceled");
    if (!reference && !canceled) return;

    const cleanupUrl = window.location.pathname;
    const clearParams = () => window.history.replaceState({}, document.title, cleanupUrl);

    if (canceled) {
      setError("Payment was canceled. You can try again from Deposit & Plans.");
      clearParams();
      return;
    }

    async function confirmCheckout() {
      try {
        const { data } = await api.get("/api/confirm-checkout", {
          params: { reference },
        });

        setCurrentPlan(data.currentPlan);
        setTasksLocked(Boolean(data.tasksLocked));
        setError("");
        loadSummary();
      } catch (err) {
        setError(err.response?.data?.error || err.message || "Could not confirm payment");
        console.error("Error confirming Paystack checkout:", err);
      } finally {
        clearParams();
      }
    }

    confirmCheckout();
  }, []);

  async function handleSignOut() {
    await logout();
  }

  function handleCopy() {
    if (!user) return;
    const code = user.referral_code || user.id;
    const link = `${window.location.origin}/?ref=${code}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const balance = monthTaskTotal + referralTotal;
  const upcoming = nextTier(referralCount);
  const referralCode = user?.referral_code || `USER-${user?.id ?? "----"}`;

  if (!user) return null;

  return (
    <div className="dc-page" style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Work+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');
        * { box-sizing: border-box; }
        @keyframes dc-gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .dc-page {
          max-width: 720px;
          margin: 0 auto;
          padding: 32px 20px 40px;
          min-height: 100%;
        }
        @media (max-width: 768px) {
          .dc-page {
            max-width: 100%;
            padding: 24px 16px 32px;
          }
        }
        @media (max-width: 480px) {
          .dc-page {
            padding: 16px 12px 24px;
          }
        }
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
        .dc-btn-outline-blue {
          background: linear-gradient(135deg, #33346B, #1F2050);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 14px rgba(31, 32, 80, 0.45);
        }
        .dc-btn-outline-blue:hover {
          background: linear-gradient(135deg, #454785, #33346B);
          box-shadow: 0 6px 18px rgba(31, 32, 80, 0.6);
          transform: translateY(-1px);
        }
        .dc-btn-outline-blue:active {
          transform: translateY(0);
        }
        @media (max-width: 560px) {
          .dc-row { flex-direction: column !important; align-items: stretch !important; }
          .dc-track { flex-wrap: wrap !important; row-gap: 28px !important; }
          .dc-stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {showUpgradePlan && (
        <UpgradePlan
          profile={user}
          onBack={() => setShowUpgradePlan(false)}
          onPlanChange={(plan, locked) => {
            setCurrentPlan(plan);
            setTasksLocked(Boolean(locked));
            loadSummary();
          }}
        />
      )}

      {!showUpgradePlan && (
        <div>
          <div style={styles.brandRow}>
            <Coins size={22} color="#C99A3D" strokeWidth={2} />
            <span style={styles.wordmark}>DigiCoin</span>
            <span style={styles.tagline}>{user.name}'s wallet</span>
            <button
              className="dc-btn dc-btn-primary"
              onClick={() => setShowUpgradePlan(true)}
              style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}
            >
              <TrendingUp size={15} />
              Plans
            </button>
            <button
              className="dc-btn dc-btn-outline-blue"
              onClick={handleSignOut}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>

          <div style={styles.card}>
            <p style={styles.eyebrow}>Your referral code</p>
            <div style={styles.codeRow} className="dc-row">
              <div style={styles.codeBox}>{referralCode}</div>
              <button className="dc-btn dc-btn-ghost" onClick={handleCopy} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
            <p style={styles.hint}>Friends who join with your link earn you a referral bonus automatically.</p>
          </div>

          <div style={styles.statsGrid} className="dc-stats-grid">
            <div style={styles.statCard}>
              <Wallet size={17} color="#33346B" />
              <div style={styles.statNum}>₦{balance.toLocaleString()}</div>
              <div style={styles.statLabel}>Balance</div>
            </div>
            <div style={styles.statCard}>
              <UserPlus size={17} color="#33346B" />
              <div style={styles.statNum}>{referralCount}</div>
              <div style={styles.statLabel}>Referrals</div>
            </div>
            <div style={styles.statCard}>
              <Sparkles size={17} color="#33346B" />
              <div style={styles.statNum}>{upcoming ? upcoming.threshold - referralCount : "—"}</div>
              <div style={styles.statLabel}>{upcoming ? "To next tier" : "Max tier reached"}</div>
            </div>
          </div>

          <TaskRewardBox />
          <ReferralRewardBox />
          <ReferralListSection />

          {error && <p style={{ ...styles.hint, color: "#B5502F" }}>{error}</p>}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "'Work Sans', sans-serif",
    background: "linear-gradient(120deg, #3FBFA8, #2E9C8F, #1F7A6C, #145E52, #226E64, #33346B, #2E9C8F)",
    backgroundSize: "300% 300%",
    animation: "dc-gradient-shift 12s ease infinite",
    color: "#1C1B1F",
  },
  brandRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" },
  wordmark: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 19, letterSpacing: "-0.01em" },
  tagline: { fontSize: 13, color: "rgba(255, 255, 255, 0.75)", marginLeft: 4, fontWeight: 600 },
  card: {
    background: "#F0F5F1",
    border: "1px solid rgba(73, 197, 182, 0.5)",
    borderRadius: 14,
    padding: "22px 24px",
    marginBottom: 16,
    boxShadow: "0 0 0 1px rgba(73, 197, 182, 0.15), 0 0 18px rgba(73, 197, 182, 0.35), 0 0 40px rgba(73, 197, 182, 0.15)",
  },
  eyebrow: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#63627A",
    margin: "0 0 12px",
  },
  codeRow: { display: "flex", gap: 10, alignItems: "center" },
  codeBox: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: "0.04em",
    background: "#E6E5F0",
    border: "1.5px dashed #B9B7CC",
    borderRadius: 8,
    padding: "11px 16px",
    flex: 1,
  },
  hint: { fontSize: 13, color: "#63627A", marginTop: 10, marginBottom: 0, lineHeight: 1.5 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 },
  statCard: {
    background: "#F0F5F1",
    border: "1px solid rgba(73, 197, 182, 0.5)",
    borderRadius: 12,
    padding: "16px 14px",
    boxShadow: "0 0 0 1px rgba(73, 197, 182, 0.15), 0 0 14px rgba(73, 197, 182, 0.3), 0 0 30px rgba(73, 197, 182, 0.12)",
  },
  statNum: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600, margin: "8px 0 2px" },
  statLabel: { fontSize: 12, color: "#63627A" },
  track: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative", padding: "8px 4px" },
  trackNode: { display: "flex", flexDirection: "column", alignItems: "center", position: "relative", flex: 1, minWidth: 100 },
  connector: { position: "absolute", top: 20, right: "50%", width: "100%", height: 2, zIndex: 0 },
  coinCircle: {
    width: 42, height: 42, borderRadius: "50%", border: "2px solid",
    display: "flex", alignItems: "center", justifyContent: "center",
    position: "relative", zIndex: 1, transition: "background 0.2s ease, border-color 0.2s ease",
  },
  trackLabel: { fontSize: 12, fontWeight: 500, marginTop: 10, textAlign: "center" },
  trackPerk: { fontSize: 11, marginTop: 3, textAlign: "center", lineHeight: 1.4, maxWidth: 110 },
};