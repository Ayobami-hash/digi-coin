import { useState, useEffect } from "react";
import { CheckCircle, Lock, Unlock, Clock } from "lucide-react";
import WithdrawModal from "./WithdrawModal";
import { fetchTaskStatus, completeTask, withdrawTaskEarnings } from "../lib/rewardsApi";

export default function TaskRewardBox() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState(false);

  async function load() {
    try {
      const data = await fetchTaskStatus();
      setStatus(data);
    } catch (e) {
      console.error("Error loading task status:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleComplete() {
    setCompleting(true);
    try {
      const data = await completeTask();
      setStatus(data);
    } catch (e) {
      setError(e.response?.data?.message || "Could not complete task");
    } finally {
      setCompleting(false);
    }
  }

  async function handleWithdraw(fields) {
    setSubmitting(true);
    setError("");
    try {
      await withdrawTaskEarnings(fields);
      setShowModal(false);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Withdrawal failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !status) {
    return <div style={styles.card}><p style={styles.hint}>Loading task rewards…</p></div>;
  }

  const { plan, todayCompleted, monthTotal, daysLeftInMonth, withdrawUnlocked, lastWithdrawal } = status;

  return (
    <div style={styles.card}>
      <p style={styles.eyebrow}>Task Reward</p>

      {!plan ? (
        <p style={styles.hint}>Activate a plan to start earning daily task rewards.</p>
      ) : (
        <>
          <div style={styles.scoreRow}>
            <div>
              <div style={styles.score}>₦{monthTotal.toLocaleString()}</div>
              <div style={styles.scoreLabel}>This month's earnings</div>
            </div>
            <div style={styles.countdown}>
              <Clock size={14} color="#63627A" />
              <span>{daysLeftInMonth} {daysLeftInMonth === 1 ? "day" : "days"} left</span>
            </div>
          </div>

          <button
            className="dc-btn"
            onClick={handleComplete}
            disabled={todayCompleted || completing}
            style={{
              width: "100%", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: todayCompleted ? "#D4EDDA" : "#33346B",
              color: todayCompleted ? "#1E5631" : "#F3F2FA",
              cursor: todayCompleted ? "default" : "pointer",
            }}
          >
            <CheckCircle size={16} />
            {todayCompleted ? "Today's task completed" : completing ? "Completing…" : `Complete today's task (+₦${plan.dailyEarnings.toLocaleString()})`}
          </button>

          <button
            className="dc-btn"
            onClick={() => withdrawUnlocked && setShowModal(true)}
            disabled={!withdrawUnlocked}
            style={{
              width: "100%", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: withdrawUnlocked ? "#2E9E5B" : "#B5502F",
              color: "#FFFFFF",
              cursor: withdrawUnlocked ? "pointer" : "not-allowed",
              opacity: withdrawUnlocked ? 1 : 0.85,
            }}
          >
            {withdrawUnlocked ? <Unlock size={15} /> : <Lock size={15} />}
            {withdrawUnlocked ? "Withdraw earnings" : "Withdraw locked until pay day"}
          </button>

          {lastWithdrawal && (
            <p style={styles.withdrawalNote}>
              ₦{Number(lastWithdrawal.amount).toLocaleString()} withdrawn —{" "}
              {lastWithdrawal.status === "successful" ? "withdrawal successful" : "pending"}
            </p>
          )}

          {error && !showModal && <p style={styles.error}>{error}</p>}
        </>
      )}

      {showModal && (
        <WithdrawModal
          title="Withdraw task earnings"
          maxAmount={monthTotal}
          // Task withdrawals have no plan-defined minimum — only pay-day
          // gating + available balance, per spec.
          minAmount={undefined}
          onSubmit={handleWithdraw}
          onClose={() => setShowModal(false)}
          submitting={submitting}
          error={error}
        />
      )}
    </div>
  );
}

const styles = {
  card: { background: "#F7F7FB", border: "1px solid #DEDDE8", borderRadius: 14, padding: "22px 24px", marginBottom: 16 },
  eyebrow: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.06em",
    textTransform: "uppercase", color: "#63627A", margin: "0 0 12px",
  },
  hint: { fontSize: 13, color: "#63627A", margin: 0, lineHeight: 1.5 },
  scoreRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  score: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "#33346B" },
  scoreLabel: { fontSize: 12, color: "#63627A", marginTop: 2 },
  countdown: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#63627A", background: "#E6E5F0", padding: "6px 10px", borderRadius: 8 },
  withdrawalNote: { fontSize: 13, color: "#33346B", marginTop: 10, fontWeight: 500 },
  error: { fontSize: 13, color: "#B5502F", marginTop: 10 },
};