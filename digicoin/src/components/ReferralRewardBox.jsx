import { useState, useEffect } from "react";
import { UserPlus, Lock, Unlock } from "lucide-react";
import WithdrawModal from "./WithdrawModal";
import { fetchReferralStatus, withdrawReferralEarnings } from "../lib/rewardsApi";
import { describeWithdrawalStatus } from "../lib/withdrawalStatus";

export default function ReferralRewardBox() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await fetchReferralStatus();
      setStatus(data);
    } catch (e) {
      console.error("Error loading referral status:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleWithdraw(fields) {
    setSubmitting(true);
    setError("");
    try {
      await withdrawReferralEarnings(fields);
      setShowModal(false);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Withdrawal failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !status) {
    return <div style={styles.card}><p style={styles.hint}>Loading referral rewards…</p></div>;
  }

  const { plan, referralCount, totalEarned, withdrawUnlocked, minimumWithdrawal, lastWithdrawal } = status;
  const referralsToUnlock = Math.max(0, 3 - referralCount);
  const withdrawalMeta = lastWithdrawal ? describeWithdrawalStatus(lastWithdrawal.status) : null;

  return (
    <div style={styles.card}>
      <p style={styles.eyebrow}>Referral Reward</p>

      {!plan ? (
        <p style={styles.hint}>Activate a plan to start earning referral bonuses.</p>
      ) : (
        <>
          <div style={styles.scoreRow}>
            <div>
              <div style={styles.score}>₦{totalEarned.toLocaleString()}</div>
              <div style={styles.scoreLabel}>Total referral earnings</div>
            </div>
            <div style={styles.counter}>
              <UserPlus size={14} color="#63627A" />
              <span>{referralCount} referred</span>
            </div>
          </div>

          {!withdrawUnlocked && (
            <p style={styles.hint2}>
              {referralsToUnlock} more {referralsToUnlock === 1 ? "referral" : "referrals"} to unlock withdrawals.
            </p>
          )}

          <button
            className="dc-btn"
            onClick={() => withdrawUnlocked && setShowModal(true)}
            disabled={!withdrawUnlocked}
            style={{
              width: "100%", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: withdrawUnlocked ? "#2E9E5B" : "#B5502F",
              color: "#FFFFFF",
              cursor: withdrawUnlocked ? "pointer" : "not-allowed",
              opacity: withdrawUnlocked ? 1 : 0.85,
            }}
          >
            {withdrawUnlocked ? <Unlock size={15} /> : <Lock size={15} />}
            {withdrawUnlocked ? "Withdraw earnings" : "Withdraw locked (min. 3 referrals)"}
          </button>

          {lastWithdrawal && (
            <p style={{ ...styles.withdrawalNote, color: withdrawalMeta.color }}>
              ₦{Number(lastWithdrawal.amount).toLocaleString()} — {withdrawalMeta.label}
              {lastWithdrawal.status === "rejected" && lastWithdrawal.admin_note && ` (${lastWithdrawal.admin_note})`}
            </p>
          )}

          {error && !showModal && <p style={styles.error}>{error}</p>}
        </>
      )}

      {showModal && (
        <WithdrawModal
          title="Withdraw referral earnings"
          maxAmount={totalEarned}
          minAmount={minimumWithdrawal}
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
  card: { background: "#F0F5F1",  border: "1px solid #DEDDE8", borderRadius: 14, padding: "22px 24px", marginBottom: 16 },
  eyebrow: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.06em",
    textTransform: "uppercase", color: "#63627A", margin: "0 0 12px",
  },
  hint: { fontSize: 13, color: "#63627A", margin: 0, lineHeight: 1.5 },
  hint2: { fontSize: 12, color: "#8C8B99", marginTop: 8, marginBottom: 0 },
  scoreRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  score: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "#33346B" },
  scoreLabel: { fontSize: 12, color: "#63627A", marginTop: 2 },
  counter: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#63627A", background: "#E6E5F0", padding: "6px 10px", borderRadius: 8 },
  withdrawalNote: { fontSize: 13, marginTop: 10, fontWeight: 600 },
  error: { fontSize: 13, color: "#B5502F", marginTop: 10 },
};