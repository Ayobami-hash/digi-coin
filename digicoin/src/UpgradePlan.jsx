import { useState, useEffect } from "react";
import { ChevronLeft, Star, Shield, Zap } from "lucide-react";

const PLAN_ICONS = {
  novice: Star,
  mid: Shield,
  advanced: Zap,
};

export default function UpgradePlan({ profile, onBack, onPlanChange }) {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    try {
      setLoading(true);
      const userId = profile?.id || profile?.code;
      const url = new URL("/api/plans", window.location.origin);
      if (userId) url.searchParams.append("userId", userId);
      
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Failed to fetch plans");
      const data = await response.json();
      setPlans(data.plans || []);
      const nextPlan = data.currentPlan || null;
      setCurrentPlan(nextPlan);
      onPlanChange?.(nextPlan);
    } catch (err) {
      setError(err.message || "Could not load plans");
      console.error("Error fetching plans:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(planId) {
    try {
      const userId = profile?.id || profile?.code;
      const response = await fetch("/api/upgrade-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          planId,
        }),
      });
      if (!response.ok) throw new Error("Upgrade failed");
      const data = await response.json();
      const nextPlan = data.currentPlan;
      setCurrentPlan(nextPlan);
      onPlanChange?.(nextPlan);
      setError("");
    } catch (err) {
      setError(err.message || "Could not complete upgrade");
      console.error("Error upgrading plan:", err);
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
        .dc-btn-primary { background: #33346B; color: #F3F2FA; }
        .dc-btn-primary:hover { opacity: 0.92; }
        .dc-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .dc-btn-ghost { background: transparent; color: #33346B; border: 1.5px solid #33346B; }
        .dc-btn-ghost:hover { background: rgba(51,52,107,0.07); }
      `}</style>

      <div style={styles.header}>
        <button
          className="dc-btn dc-btn-ghost"
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <ChevronLeft size={18} />
          Back
        </button>
        <h1 style={styles.title}>Upgrade Plan</h1>
      </div>

      {loading && (
        <div style={{ ...styles.card, textAlign: "center", color: "#63627A" }}>
          Loading plans…
        </div>
      )}

      {error && (
        <div style={{ ...styles.card, background: "#FEF2F0", borderColor: "#E5BFBA", color: "#8B4F47" }}>
          {error}
        </div>
      )}

      {!loading && plans.length === 0 && !error && (
        <div style={{ ...styles.card, textAlign: "center", color: "#63627A" }}>
          No plans available
        </div>
      )}

      {!loading && plans.length > 0 && (
        <div style={styles.plansContainer}>
          {plans.map((plan, index) => {
            const isActive = currentPlan?.id === plan.id;
            const IconComponent = PLAN_ICONS[plan.icon] || Star;

            return (
              <div key={plan.id} style={{ ...styles.planCard, borderColor: isActive ? "#33346B" : "#DEDDE8" }}>
                <div style={styles.planHeader}>
                  <div style={styles.planIconBox}>
                    <IconComponent size={24} color="#33346B" />
                  </div>
                  <div style={styles.planTitleRow}>
                    <h2 style={styles.planName}>{plan.name}</h2>
                    <span style={styles.planLevel}>PLAN {index + 1} OF {plans.length}</span>
                  </div>
                  {isActive && (
                    <div style={styles.activeBadge}>✓ Active</div>
                  )}
                </div>

                <div style={styles.planDetails}>
                  {plan.activation !== undefined && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>ACTIVATION</span>
                      <span style={styles.detailValue}>{typeof plan.activation === "number" ? `₦${plan.activation.toLocaleString()}` : plan.activation}</span>
                    </div>
                  )}

                  {plan.dailyEarnings !== undefined && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>DAILY EARNINGS</span>
                      <span style={styles.detailValue}>{typeof plan.dailyEarnings === "number" ? `₦${plan.dailyEarnings.toLocaleString()}` : plan.dailyEarnings}</span>
                    </div>
                  )}

                  {plan.taskWithdrawal !== undefined && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>TASK WITHDRAWAL</span>
                      <span style={styles.detailValue}>{typeof plan.taskWithdrawal === "number" ? `₦${plan.taskWithdrawal.toLocaleString()}` : plan.taskWithdrawal}</span>
                    </div>
                  )}

                  {plan.referralBonus !== undefined && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>REFERRAL BONUS</span>
                      <span style={styles.detailValue}>{typeof plan.referralBonus === "number" ? `₦${plan.referralBonus.toLocaleString()}` : plan.referralBonus}</span>
                    </div>
                  )}
                </div>

                {plan.minimumWithdrawal && (
                  <div style={styles.minimumBox}>
                    <span style={styles.minimumLabel}>Minimum affiliate/referral withdrawal:</span>
                    <span style={styles.minimumValue}>{typeof plan.minimumWithdrawal === "number" ? `₦${plan.minimumWithdrawal.toLocaleString()}` : plan.minimumWithdrawal}</span>
                  </div>
                )}

                <button
                  className="dc-btn"
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isActive}
                  style={{
                    width: "100%",
                    marginTop: 16,
                    background: isActive ? "#E1E0EA" : "#33346B",
                    color: isActive ? "#8C8B99" : "#F3F2FA",
                    cursor: isActive ? "default" : "pointer",
                  }}
                >
                  {isActive ? "Currently Active" : "Upgrade to this plan"}
                </button>
              </div>
            );
          })}
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
    padding: "20px",
    maxWidth: 720,
    margin: "0 auto",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 28,
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 28,
    fontWeight: 600,
    margin: 0,
    flex: 1,
  },
  card: {
    background: "#F7F7FB",
    border: "1px solid #DEDDE8",
    borderRadius: 14,
    padding: "20px",
    marginBottom: 16,
  },
  plansContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 16,
  },
  planCard: {
    background: "#F7F7FB",
    border: "1.5px solid",
    borderRadius: 14,
    padding: 20,
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  planHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
    borderBottom: "1px solid #DEDDE8",
    paddingBottom: 14,
  },
  planIconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    background: "#E6E5F0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  planTitleRow: {
    flex: 1,
  },
  planName: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 18,
    fontWeight: 600,
    margin: "0 0 4px",
    color: "#33346B",
  },
  planLevel: {
    fontSize: 11,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#63627A",
    fontWeight: 500,
  },
  activeBadge: {
    background: "#D4EDDA",
    color: "#1E5631",
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 12px",
    borderRadius: 6,
    whiteSpace: "nowrap",
  },
  planDetails: {
    marginBottom: 12,
  },
  detailRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    padding: "12px 0",
    borderBottom: "1px solid #DEDDE8",
  },
  detailLabel: {
    fontSize: 11,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#63627A",
    fontWeight: 600,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 600,
    color: "#33346B",
    textAlign: "right",
  },
  minimumBox: {
    background: "#E6E5F0",
    border: "1px solid #DEDDE8",
    borderRadius: 8,
    padding: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 13,
    marginBottom: 16,
  },
  minimumLabel: {
    color: "#63627A",
  },
  minimumValue: {
    fontWeight: 600,
    color: "#33346B",
  },
};
