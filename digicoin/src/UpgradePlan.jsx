import { useState, useEffect } from "react";
import { ChevronLeft, Star, Shield, Zap } from "lucide-react";
import { api } from "./lib/api";

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
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
  try {
    setLoading(true);
    const { data } = await api.get("/api/plans");
    setPlans(data.plans || []);
    const nextPlan = data.currentPlan || null;
    setCurrentPlan(nextPlan);
    onPlanChange?.(nextPlan, data.tasksLocked);
  } catch (err) {
    setError(err.response?.data?.error || err.message || "Could not load plans");
  } finally {
    setLoading(false);
  }
}

  function beginPayment(plan) {
    setSelectedPlan(plan);
    setPaymentSuccess(false);
    setError("");
  }

  async function handlePayment() {
  if (!selectedPlan) return;
  try {
    setPaymentProcessing(true);
    const { data } = await api.post("/api/create-checkout-session", { planId: selectedPlan.id });
    if (!data.url) throw new Error("Paystack did not return a checkout URL");
    window.location.assign(data.url);
  } catch (err) {
    setError(err.response?.data?.error || err.message || "Could not complete payment");
  } finally {
    setPaymentProcessing(false);
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

      {!loading && plans.length > 0 && !selectedPlan && (
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

                {plan.referralMinWithdrawal && (
                  <div style={styles.minimumBox}>
                    <span style={styles.minimumLabel}>Minimum referral withdrawal:</span>
                    <span style={styles.minimumValue}>{typeof plan.referralMinWithdrawal === "number" ? `₦${plan.referralMinWithdrawal.toLocaleString()}` : plan.referralMinWithdrawal}</span>
                  </div>
                )}

                <button
                  className="dc-btn"
                  onClick={() => beginPayment(plan)}
                  disabled={isActive}
                  style={{
                    width: "100%",
                    marginTop: 16,
                    background: isActive ? "#E1E0EA" : "#33346B",
                    color: isActive ? "#8C8B99" : "#F3F2FA",
                    cursor: isActive ? "default" : "pointer",
                  }}
                >
                  {isActive ? "Currently Active" : "Pay for this plan"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedPlan && (
        <div style={styles.card}>
          <h2 style={{ margin: 0, marginBottom: 14 }}>{paymentSuccess ? "Payment Complete" : `Pay for ${selectedPlan.name}`}</h2>
          <p style={styles.hint}>
            {paymentSuccess
              ? "Your plan is active. Engagement tasks are now unlocked."
              : "Complete the payment to unlock engagement tasks and start earning rewards."
            }
          </p>
          <div style={styles.paymentBox}>
            <div style={styles.paymentRow}>
              <span>Plan</span>
              <strong>{selectedPlan.name}</strong>
            </div>
            <div style={styles.paymentRow}>
              <span>Amount</span>
              <strong>{typeof selectedPlan.activation === "number" ? `₦${selectedPlan.activation.toLocaleString()}` : selectedPlan.activation}</strong>
            </div>
            <div style={styles.paymentRow}>
              <span>Rewards</span>
              <strong>{selectedPlan.dailyEarnings ? `${selectedPlan.dailyEarnings}/day` : "—"}</strong>
            </div>
          </div>
          {!paymentSuccess ? (
            <button
              className="dc-btn dc-btn-primary"
              onClick={handlePayment}
              disabled={paymentProcessing}
              style={{ width: "100%", marginTop: 18 }}
            >
              {paymentProcessing ? "Processing payment…" : "Confirm payment"}
            </button>
          ) : (
            <button
              className="dc-btn"
              onClick={() => setSelectedPlan(null)}
              style={{ width: "100%", marginTop: 18, background: "#E1E0EA", color: "#33346B" }}
            >
              Back to plans
            </button>
          )}
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
  paymentBox: {
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: 16,
    padding: "18px",
    marginTop: 18,
  },
  paymentRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #E2E8F0",
    fontSize: 14,
  },
};