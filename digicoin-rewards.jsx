import { useState, useEffect } from "react";
import { Coins, Copy, Check, Share2, ThumbsUp, MessageSquare, UserPlus, Wallet, RotateCcw, ArrowRight, Sparkles, Lock } from "lucide-react";

const TIERS = [
  { threshold: 1, reward: 50, label: "First referral" },
  { threshold: 3, reward: 200, label: "Rising farmer" },
  { threshold: 5, reward: 500, label: "Power farmer" },
  { threshold: 10, reward: 1500, label: "DigiCoin Elite" },
];

const TASKS = [
  { id: "follow", icon: ThumbsUp, label: "Follow DigiCoin on X", reward: 25 },
  { id: "share", icon: Share2, label: "Share your referral link", reward: 25 },
  { id: "post", icon: MessageSquare, label: "Post using #DigiCoin", reward: 50 },
  { id: "invite", icon: UserPlus, label: "Tag 3 friends in a comment", reward: 25 },
];

function makeCode(name) {
  const base = (name || "farmer").replace(/[^a-zA-Z]/g, "").slice(0, 6).toUpperCase() || "FARMER";
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}-${suffix}`;
}

function referralCredit(count) {
  return TIERS.reduce((sum, t) => (count >= t.threshold ? t.reward : sum), 0);
}

function nextTier(count) {
  return TIERS.find((t) => count < t.threshold) || null;
}

export default function DigiCoinApp() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [friendInput, setFriendInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  // Uses window.storage when available (Claude's artifact preview) and
  // falls back to localStorage automatically, so this same file works
  // whether you're viewing it here or running it in your own project.
  const hasClaudeStorage = typeof window !== "undefined" && window.storage && typeof window.storage.get === "function";

  async function loadProfile() {
    if (hasClaudeStorage) {
      const res = await window.storage.get("profile");
      return res && res.value ? JSON.parse(res.value) : null;
    }
    const raw = localStorage.getItem("profile");
    return raw ? JSON.parse(raw) : null;
  }

  async function persistProfile(value) {
    if (hasClaudeStorage) {
      await window.storage.set("profile", JSON.stringify(value));
    } else {
      localStorage.setItem("profile", JSON.stringify(value));
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const loaded = await loadProfile();
        if (loaded) setProfile(loaded);
      } catch (e) {
        // no existing profile
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveProfile(next) {
    setProfile(next);
    try {
      await persistProfile(next);
    } catch (e) {
      setError("Couldn't save your progress. Your changes will only last this session.");
    }
  }

  function handleCreateProfile(e) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    const next = { name, code: makeCode(name), createdAt: Date.now(), referrals: [], tasksCompleted: [], premium: false };
    saveProfile(next);
  }

  function handleAddReferral(e) {
    e.preventDefault();
    const friend = friendInput.trim();
    if (!friend || !profile) return;
    const referral = { id: `${Date.now()}`, name: friend, date: new Date().toISOString() };
    const next = { ...profile, referrals: [referral, ...profile.referrals] };
    saveProfile(next);
    setFriendInput("");
  }

  function toggleTask(taskId) {
    if (!profile || !profile.premium) return;
    const done = profile.tasksCompleted.includes(taskId);
    const next = {
      ...profile,
      tasksCompleted: done
        ? profile.tasksCompleted.filter((id) => id !== taskId)
        : [...profile.tasksCompleted, taskId],
    };
    saveProfile(next);
  }

  // Demo-only stand-in for a real checkout. In production this should call
  // POST /api/payments/create-checkout-session on the backend and redirect
  // the user to Stripe; premium should only ever be set true by the
  // webhook after Stripe confirms payment actually succeeded — never
  // client-side like this. See the backend README for the real flow.
  function handleActivatePremium() {
    if (!profile) return;
    const next = { ...profile, premium: true };
    saveProfile(next);
  }

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    (async () => {
      try {
        if (hasClaudeStorage) {
          await window.storage.delete("profile");
        } else {
          localStorage.removeItem("profile");
        }
      } catch (e) {
        // ignore
      }
      setProfile(null);
      setConfirmReset(false);
    })();
  }

  function handleGoBack() {
    setProfile(null);
    setNameInput(profile?.name || "");
    setFriendInput("");
    setError("");
    setConfirmReset(false);
  }

  function handleCopy() {
    if (!profile) return;
    const link = `digicoin.app/join?ref=${profile.code}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const count = profile?.referrals?.length || 0;
  const taskCredit = profile ? profile.tasksCompleted.reduce((sum, id) => {
    const t = TASKS.find((x) => x.id === id);
    return sum + (t ? t.reward : 0);
  }, 0) : 0;
  const balance = referralCredit(count) + taskCredit;
  const upcoming = nextTier(count);

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Work+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');
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
        .dc-btn-primary { background: #33346B; color: #F3F2FA; }
        .dc-btn-primary:hover { opacity: 0.92; }
        .dc-btn-ghost { background: transparent; color: #33346B; border: 1.5px solid #33346B; }
        .dc-btn-ghost:hover { background: rgba(51,52,107,0.07); }
        .dc-input {
          font-family: 'Work Sans', sans-serif;
          font-size: 15px;
          padding: 11px 14px;
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
        .dc-task {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 0; border-bottom: 1px solid #E1E0EA;
          cursor: pointer;
        }
        .dc-task:last-child { border-bottom: none; }
        .dc-check {
          width: 22px; height: 22px; border-radius: 6px; border: 1.5px solid #C7C6D6;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease; flex-shrink: 0;
          padding: 0;
          background: transparent;
        }
        .dc-check:active { transform: scale(0.94); }
        .dc-check .dc-check-icon {
          opacity: 0;
          transform: scale(0.5);
          transition: opacity 0.15s ease, transform 0.15s ease;
        }
        .dc-check.is-done .dc-check-icon {
          opacity: 1;
          transform: scale(1);
        }
        .dc-locked {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 28px 12px 8px;
        }
        .dc-locked-icon {
          width: 56px; height: 56px; border-radius: 16px; background: #E6E5F0;
          display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
        }
        @media (max-width: 560px) {
          .dc-row { flex-direction: column !important; align-items: stretch !important; }
          .dc-track { flex-wrap: wrap !important; row-gap: 28px !important; }
        }
      `}</style>

      {loading && (
        <div style={{ ...styles.card, textAlign: "center", color: "#63627A" }}>Loading your wallet…</div>
      )}

      {!loading && !profile && (
        <div style={styles.card}>
          <div style={styles.brandRow}>
            <Coins size={22} color="#C99A3D" strokeWidth={2} />
            <span style={styles.wordmark}>DigiCoin</span>
          </div>
          <h1 style={styles.h1}>Farm coins for every friend</h1>
          <p style={styles.subtitle}>
            Refer friends and complete social tasks to earn DGC. Enter your name to get your referral code and start farming.
          </p>
          <form onSubmit={handleCreateProfile} style={{ display: "flex", gap: 10, marginTop: 22 }} className="dc-row">
            <input
              className="dc-input"
              placeholder="Your name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              autoFocus
              required
            />
            <button className="dc-btn dc-btn-primary" type="submit" style={{ whiteSpace: "nowrap" }}>
              Get my code
            </button>
          </form>
        </div>
      )}

      {!loading && profile && (
        <div>
          <div style={styles.brandRow}>
            <Coins size={22} color="#C99A3D" strokeWidth={2} />
            <span style={styles.wordmark}>DigiCoin</span>
            <span style={styles.tagline}>{profile.name}'s wallet{profile.premium ? " · Premium" : ""}</span>
            <button
              className="dc-btn dc-btn-ghost"
              onClick={handleGoBack}
              style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}
            >
              <ArrowRight size={15} style={{ transform: "rotate(180deg)" }} />
              Go back
            </button>
          </div>

          {/* Referral code card */}
          <div style={styles.card}>
            <p style={styles.eyebrow}>Your referral code</p>
            <div style={styles.codeRow} className="dc-row">
              <div style={styles.codeBox}>{profile.code}</div>
              <button className="dc-btn dc-btn-ghost" onClick={handleCopy} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
            <p style={styles.hint}>Friends who join with your link start with a 50 DGC bonus.</p>
          </div>

          {/* Stats */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <Wallet size={17} color="#33346B" />
              <div style={styles.statNum}>{balance.toLocaleString()} <span style={styles.statUnit}>DGC</span></div>
              <div style={styles.statLabel}>Balance</div>
            </div>
            <div style={styles.statCard}>
              <UserPlus size={17} color="#33346B" />
              <div style={styles.statNum}>{count}</div>
              <div style={styles.statLabel}>Referrals</div>
            </div>
            <div style={styles.statCard}>
              <Sparkles size={17} color="#33346B" />
              <div style={styles.statNum}>{upcoming ? upcoming.threshold - count : "—"}</div>
              <div style={styles.statLabel}>{upcoming ? "To next tier" : "Max tier reached"}</div>
            </div>
          </div>

          {/* Tier progress */}
          <div style={styles.card}>
            <p style={styles.eyebrow}>Referral tiers</p>
            <div style={styles.track} className="dc-track">
              {TIERS.map((tier, i) => {
                const reached = count >= tier.threshold;
                return (
                  <div key={tier.threshold} style={styles.trackNode}>
                    {i > 0 && (
                      <div style={{ ...styles.connector, background: reached ? "#C99A3D" : "#D3D3DE" }} />
                    )}
                    <div style={{ ...styles.coinCircle, background: reached ? "#C99A3D" : "#F7F7FB", borderColor: reached ? "#C99A3D" : "#D3D3DE" }}>
                      <Coins size={18} color={reached ? "#33232A" : "#8C8B99"} strokeWidth={2} />
                    </div>
                    <div style={styles.trackLabel}>{tier.threshold} {tier.threshold === 1 ? "referral" : "referrals"}</div>
                    <div style={{ ...styles.trackPerk, color: reached ? "#33346B" : "#8C8B99" }}>+{tier.reward} DGC · {tier.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engagement tasks — locked until Premium is active */}
          <div style={styles.card}>
            <p style={styles.eyebrow}>Engagement tasks</p>

            {!profile.premium && (
              <div className="dc-locked">
                <div className="dc-locked-icon">
                  <Lock size={24} color="#33346B" />
                </div>
                <h3 style={styles.lockedTitle}>Unlock tasks</h3>
                <p style={{ ...styles.hint, marginTop: 4, marginBottom: 20, maxWidth: 320 }}>
                  Activate Premium to access engagement tasks.
                </p>
                <button className="dc-btn dc-btn-primary" onClick={handleActivatePremium}>
                  Activate Premium
                </button>
                <p style={{ ...styles.hint, marginTop: 14, fontSize: 11 }}>
                  Demo button — wire this to the Stripe checkout in the backend so premium is only granted after a real payment confirms.
                </p>
              </div>
            )}

            {profile.premium && (
              <>
                <p style={styles.hint}>Mark tasks off as you complete them to add DGC to your balance.</p>
                <div style={{ marginTop: 8 }}>
                  {TASKS.map((task) => {
                    const done = profile.tasksCompleted.includes(task.id);
                    const Icon = task.icon;
                    return (
                      <div
                        key={task.id}
                        className="dc-task"
                        onClick={() => toggleTask(task.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleTask(task.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <Icon size={16} color="#63627A" />
                          <span style={{ fontSize: 14, textDecoration: done ? "line-through" : "none", color: done ? "#8C8B99" : "#1C1B1F" }}>
                            {task.label}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={styles.taskReward}>+{task.reward} DGC</span>
                          <button
                            type="button"
                            className={`dc-check${done ? " is-done" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTask(task.id);
                            }}
                            style={{ background: done ? "#33346B" : "transparent", borderColor: done ? "#33346B" : "#C7C6D6" }}
                          >
                            <Check className="dc-check-icon" size={14} color="#F3F2FA" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Add referral (demo) */}
          <div style={styles.card}>
            <p style={styles.eyebrow}>Record a referral</p>
            <p style={styles.hint}>This simulates a friend signing up with your code, so you can see rewards unlock.</p>
            <form onSubmit={handleAddReferral} style={{ display: "flex", gap: 10, marginTop: 12 }} className="dc-row">
              <input
                className="dc-input"
                placeholder="Friend's name"
                value={friendInput}
                onChange={(e) => setFriendInput(e.target.value)}
              />
              <button className="dc-btn dc-btn-primary" type="submit" style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                Add referral <ArrowRight size={15} />
              </button>
            </form>
          </div>

          {/* Activity */}
          {profile.referrals.length > 0 && (
            <div style={styles.card}>
              <p style={styles.eyebrow}>Activity</p>
              <div>
                {profile.referrals.map((r) => (
                  <div key={r.id} style={styles.activityRow}>
                    <span style={styles.activityName}>{r.name}</span>
                    <span style={styles.activityDate}>{new Date(r.date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p style={{ ...styles.hint, color: "#B5502F" }}>{error}</p>}

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              onClick={handleReset}
              style={{ background: "none", border: "none", color: "#8C8B99", fontSize: 13, fontFamily: "'Work Sans', sans-serif", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <RotateCcw size={13} />
              {confirmReset ? "Click again to confirm reset" : "Reset demo data"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "'Work Sans', sans-serif",
    background: "#EDEEF2",
    color: "#1C1B1F",
    padding: "32px 20px 40px",
    maxWidth: 640,
    margin: "0 auto",
    minHeight: "100%",
  },
  brandRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" },
  wordmark: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 19, letterSpacing: "-0.01em" },
  tagline: { fontSize: 13, color: "#63627A", marginLeft: 4 },
  h1: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 30, margin: "6px 0 8px", lineHeight: 1.15 },
  subtitle: { fontSize: 15, color: "#63627A", lineHeight: 1.55, margin: 0, maxWidth: 440 },
  card: {
    background: "#F7F7FB",
    border: "1px solid #DEDDE8",
    borderRadius: 14,
    padding: "22px 24px",
    marginBottom: 16,
  },
  eyebrow: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#63627A",
    margin: "0 0 12px",
  },
  lockedTitle: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 19, margin: 0, color: "#1C1B1F" },
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
    background: "#F7F7FB",
    border: "1px solid #DEDDE8",
    borderRadius: 12,
    padding: "16px 14px",
  },
  statNum: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600, margin: "8px 0 2px" },
  statUnit: { fontSize: 13, fontWeight: 500, color: "#63627A" },
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
  taskReward: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, color: "#C99A3D" },
  activityRow: {
    display: "flex", justifyContent: "space-between", padding: "10px 0",
    borderBottom: "1px solid #DEDDE8", fontSize: 14,
  },
  activityName: { fontWeight: 500 },
  activityDate: { color: "#63627A", fontSize: 13 },
};