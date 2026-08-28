import { useState, useEffect, useRef } from "react";
import { Upload, Lock, Unlock, Clock, ExternalLink, Hourglass, CheckCircle2, XCircle } from "lucide-react";
import WithdrawModal from "./WithdrawModal";
import { fetchTaskStatus, submitTaskProof, withdrawTaskEarnings } from "../lib/rewardsApi";

const STATUS_META = {
  pending: { icon: Hourglass, color: "#C99A3D", bg: "#FBF3E1", label: "Pending review" },
  approved: { icon: CheckCircle2, color: "#1E5631", bg: "#D4EDDA", label: "Approved" },
  rejected: { icon: XCircle, color: "#B5502F", bg: "#FEF2F0", label: "Rejected" },
};

export default function TaskRewardBox() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

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

  function handlePickFile() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const data = await submitTaskProof(file);
      setStatus(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit proof");
    } finally {
      setUploading(false);
      e.target.value = ""; // allow re-selecting the same file if needed
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

  const { plan, task, submission, monthTotal, daysLeftInMonth, withdrawUnlocked, lastWithdrawal } = status;
  const meta = submission ? STATUS_META[submission.status] : null;
  const StatusIcon = meta?.icon;
  const canSubmit = !submission || submission.status === "rejected";

  return (
    <div style={styles.card}>
      <p style={styles.eyebrow}>Task Reward</p>

      {!plan ? (
        <p style={styles.hint}>Activate a plan to start earning daily task rewards.</p>
      ) : !task ? (
        <p style={styles.hint}>No task is available right now — check back soon.</p>
      ) : (
        <>
          <div style={styles.scoreRow}>
            <div>
              <div style={styles.score}>₦{monthTotal.toLocaleString()}</div>
              <div style={styles.scoreLabel}>This month's approved earnings</div>
            </div>
            <div style={styles.countdown}>
              <Clock size={14} color="#63627A" />
              <span>{daysLeftInMonth} {daysLeftInMonth === 1 ? "day" : "days"} left</span>
            </div>
          </div>

          <div style={styles.taskBox}>
            <div style={styles.taskHeader}>
              <span style={styles.taskTitle}>{task.title}</span>
              <span style={styles.taskReward}>+₦{task.reward_amount.toLocaleString()}</span>
            </div>
            {task.description && <p style={styles.taskDesc}>{task.description}</p>}
            {task.link && (
              <a href={task.link} target="_blank" rel="noopener noreferrer" style={styles.taskLink}>
                Open task link <ExternalLink size={12} />
              </a>
            )}
          </div>

          {submission && (
            <div style={{ ...styles.statusBadge, background: meta.bg, color: meta.color }}>
              <StatusIcon size={15} />
              <span>{meta.label}</span>
            </div>
          )}

          {submission?.status === "rejected" && submission.admin_note && (
            <p style={styles.rejectNote}>Reason: {submission.admin_note}</p>
          )}

          {canSubmit && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <button
                className="dc-btn"
                onClick={handlePickFile}
                disabled={uploading}
                style={{
                  width: "100%", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  background: "#33346B", color: "#F3F2FA",
                }}
              >
                <Upload size={16} />
                {uploading ? "Uploading…" : submission?.status === "rejected" ? "Resubmit screenshot" : "Submit screenshot proof"}
              </button>
            </>
          )}

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
  card: { background: "#F0F5F1",  border: "1px solid #DEDDE8", borderRadius: 14, padding: "22px 24px", marginBottom: 16 },
  eyebrow: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.06em",
    textTransform: "uppercase", color: "#63627A", margin: "0 0 12px",
  },
  hint: { fontSize: 13, color: "#63627A", margin: 0, lineHeight: 1.5 },
  scoreRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  score: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "#33346B" },
  scoreLabel: { fontSize: 12, color: "#63627A", marginTop: 2 },
  countdown: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#63627A", background: "#E6E5F0", padding: "6px 10px", borderRadius: 8 },
  taskBox: { background: "#E6E5F0", border: "1px solid #DEDDE8", borderRadius: 10, padding: "14px 16px", marginTop: 16 },
  taskHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  taskTitle: { fontSize: 14, fontWeight: 600, color: "#1C1B1F" },
  taskReward: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: "#C99A3D", whiteSpace: "nowrap" },
  taskDesc: { fontSize: 13, color: "#63627A", marginTop: 6, marginBottom: 0, lineHeight: 1.5 },
  taskLink: { fontSize: 12, color: "#33346B", fontWeight: 600, marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" },
  statusBadge: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, padding: "6px 12px", borderRadius: 8, marginTop: 12 },
  rejectNote: { fontSize: 12, color: "#B5502F", marginTop: 6, marginBottom: 0 },
  withdrawalNote: { fontSize: 13, color: "#33346B", marginTop: 10, fontWeight: 500 },
  error: { fontSize: 13, color: "#B5502F", marginTop: 10 },
};