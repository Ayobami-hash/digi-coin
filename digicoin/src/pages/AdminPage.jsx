import { useState, useEffect } from "react";
import { Coins, Check, X, Plus, ArrowLeft, Pencil, Trash2, Landmark } from "lucide-react";
import {
  fetchPendingSubmissions, approveSubmission, rejectSubmission,
  fetchAdminTasks, createAdminTask, updateAdminTask, deleteAdminTask,
  fetchAdminWithdrawals, approveWithdrawal, rejectWithdrawal, payWithdrawal, finalizeWithdrawalOtp,
} from "../lib/rewardsApi";

export default function AdminPage({ onBack }) {
  const [tab, setTab] = useState("submissions"); // "submissions" | "tasks" | "withdrawals"
  const [lightboxUrl, setLightboxUrl] = useState(null);

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Work+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .dc-btn {
          font-family: 'Work Sans', sans-serif; font-weight: 600; font-size: 14px;
          border: none; border-radius: 8px; padding: 10px 16px; cursor: pointer;
          transition: opacity 0.12s ease;
        }
        .dc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .dc-btn:hover { opacity: 0.92; }
        .dc-input {
          font-family: 'Work Sans', sans-serif; font-size: 14px; padding: 10px 12px;
          border-radius: 8px; border: 1.5px solid #D3D3DE; background: #F7F7FB;
          width: 100%; outline: none;
        }
        .dc-input:focus { border-color: #33346B; }
        .proof-thumb { cursor: zoom-in; transition: opacity 0.12s ease; }
        .proof-thumb:hover { opacity: 0.85; }
      `}</style>

      <div style={styles.header}>
        <button className="dc-btn" onClick={onBack} style={{ background: "transparent", color: "#33346B", display: "flex", alignItems: "center", gap: 6, padding: "8px 10px" }}>
          <ArrowLeft size={16} /> Back to app
        </button>
        <div style={styles.brandRow}>
          <Coins size={20} color="#C99A3D" />
          <span style={styles.wordmark}>DigiCoin Admin</span>
        </div>
      </div>

      <div style={styles.tabs}>
        <button
          onClick={() => setTab("submissions")}
          style={{ ...styles.tabBtn, ...(tab === "submissions" ? styles.tabBtnActive : {}) }}
        >
          Pending submissions
        </button>
        <button
          onClick={() => setTab("tasks")}
          style={{ ...styles.tabBtn, ...(tab === "tasks" ? styles.tabBtnActive : {}) }}
        >
          Task pool
        </button>
        <button
          onClick={() => setTab("withdrawals")}
          style={{ ...styles.tabBtn, ...(tab === "withdrawals" ? styles.tabBtnActive : {}) }}
        >
          Withdrawals
        </button>
      </div>

      {tab === "submissions"
        ? <SubmissionsPanel onImageClick={setLightboxUrl} />
        : tab === "tasks"
        ? <TaskPoolPanel />
        : <WithdrawalsPanel />}

      {lightboxUrl && (
        <div style={styles.lightboxOverlay} onClick={() => setLightboxUrl(null)}>
          <button style={styles.lightboxClose} onClick={() => setLightboxUrl(null)}>
            <X size={22} color="#fff" />
          </button>
          <img src={lightboxUrl} alt="Full size proof" style={styles.lightboxImg} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function SubmissionsPanel({ onImageClick }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchPendingSubmissions("pending");
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];
      setSubmissions(list);
    } catch (e) {
      setError(e.response?.data?.message || "Could not load submissions");
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleApprove(id) {
    setBusyId(id);
    setError("");
    try {
      await approveSubmission(id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e.response?.data?.message || "Could not approve submission");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    setBusyId(id);
    setError("");
    try {
      await rejectSubmission(id, rejectNote);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      setRejectingId(null);
      setRejectNote("");
    } catch (e) {
      setError(e.response?.data?.message || "Could not reject submission");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p style={styles.hint}>Loading submissions…</p>;

  return (
    <div>
      {error && <p style={styles.error}>{error}</p>}
      {submissions.length === 0 ? (
        <p style={styles.hint}>No pending submissions right now.</p>
      ) : (
        <div style={styles.grid}>
          {submissions.map((s) => (
            <div key={s.id} style={styles.subCard}>
              <img
                src={s.proof_url}
                alt="Submitted proof"
                className="proof-thumb"
                style={styles.proofImg}
                onClick={() => onImageClick(s.proof_url)}
              />
              <div style={styles.subBody}>
                <p style={styles.subUser}>{s.user?.name} <span style={styles.subEmail}>({s.user?.email})</span></p>
                <p style={styles.subTask}>{s.task?.title} — ₦{Number(s.reward_amount).toLocaleString()}</p>
                <p style={styles.subDate}>{new Date(s.created_at).toLocaleString()}</p>

                {rejectingId === s.id ? (
                  <div style={{ marginTop: 10 }}>
                    <input
                      className="dc-input"
                      placeholder="Reason (optional)"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button className="dc-btn" onClick={() => handleReject(s.id)} disabled={busyId === s.id} style={{ background: "#B5502F", color: "#fff", flex: 1 }}>
                        Confirm reject
                      </button>
                      <button className="dc-btn" onClick={() => setRejectingId(null)} style={{ background: "#E1E0EA", color: "#33346B" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      className="dc-btn"
                      onClick={() => handleApprove(s.id)}
                      disabled={busyId === s.id}
                      style={{ background: "#2E9E5B", color: "#fff", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      <Check size={15} /> Approve
                    </button>
                    <button
                      className="dc-btn"
                      onClick={() => setRejectingId(s.id)}
                      disabled={busyId === s.id}
                      style={{ background: "#FEF2F0", color: "#B5502F", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      <X size={15} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskPoolPanel() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", link: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [rowError, setRowError] = useState({});
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAdminTasks();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];
      setTasks(list);
    } catch (e) {
      console.error(e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await createAdminTask(form);
      setForm({ title: "", description: "", link: "" });
      setShowForm(false);
      load();
    } catch (e) {
      setFormError(e.response?.data?.message || "Could not create task — check the fields above.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(task) {
    await updateAdminTask(task.id, { is_active: !task.is_active });
    load();
  }

  function startEdit(task) {
    setEditingId(task.id);
    setEditForm({
      title: task.title,
      description: task.description || "",
      link: task.link || "",
    });
  }

  async function handleSaveEdit(taskId) {
    setBusyId(taskId);
    setRowError((prev) => ({ ...prev, [taskId]: "" }));
    try {
      await updateAdminTask(taskId, editForm);
      setEditingId(null);
      load();
    } catch (e) {
      setRowError((prev) => ({ ...prev, [taskId]: e.response?.data?.message || "Could not save changes." }));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(task) {
    if (!window.confirm(`Delete "${task.title}"? This can't be undone.`)) return;
    setBusyId(task.id);
    setRowError((prev) => ({ ...prev, [task.id]: "" }));
    try {
      await deleteAdminTask(task.id);
      load();
    } catch (e) {
      setRowError((prev) => ({ ...prev, [task.id]: e.response?.data?.message || "Could not delete task." }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <p style={styles.poolHint}>
        Reward amount is no longer set per task — it's based on each user's active plan (daily earnings) at the time they submit.
      </p>

      <button
        className="dc-btn"
        onClick={() => { setShowForm((v) => !v); setFormError(""); }}
        style={{ background: "#33346B", color: "#fff", display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}
      >
        <Plus size={15} /> {showForm ? "Cancel" : "Add task to pool"}
      </button>

      {showForm && (
        <form onSubmit={handleCreate} style={styles.form}>
          <input className="dc-input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required style={{ marginBottom: 8 }} />
          <textarea className="dc-input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} style={{ marginBottom: 8, resize: "vertical" }} />
          <input className="dc-input" placeholder="Link (optional)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} style={{ marginBottom: 12 }} />
          {formError && <p style={styles.error}>{formError}</p>}
          <button className="dc-btn" type="submit" disabled={saving} style={{ background: "#33346B", color: "#fff", width: "100%" }}>
            {saving ? "Saving…" : "Create task"}
          </button>
        </form>
      )}

      {loading ? (
        <p style={styles.hint}>Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <p style={styles.hint}>No tasks in the pool yet — add one above.</p>
      ) : (
        <div style={styles.taskList}>
          {tasks.map((t) => (
            <div key={t.id} style={styles.taskCard}>
              {editingId === t.id ? (
                <div style={{ width: "100%" }}>
                  <input className="dc-input" placeholder="Title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} style={{ marginBottom: 8 }} />
                  <textarea className="dc-input" placeholder="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} style={{ marginBottom: 8, resize: "vertical" }} />
                  <input className="dc-input" placeholder="Link" value={editForm.link} onChange={(e) => setEditForm({ ...editForm, link: e.target.value })} style={{ marginBottom: 8 }} />
                  {rowError[t.id] && <p style={styles.error}>{rowError[t.id]}</p>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="dc-btn" onClick={() => handleSaveEdit(t.id)} disabled={busyId === t.id} style={{ background: "#2E9E5B", color: "#fff", flex: 1 }}>
                      {busyId === t.id ? "Saving…" : "Save"}
                    </button>
                    <button className="dc-btn" onClick={() => setEditingId(null)} style={{ background: "#E1E0EA", color: "#33346B", flex: 1 }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <p style={styles.subTask}>{t.title}</p>
                    {t.description && <p style={styles.subDate}>{t.description}</p>}
                    {rowError[t.id] && <p style={styles.error}>{rowError[t.id]}</p>}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      className="dc-btn"
                      onClick={() => toggleActive(t)}
                      style={{ background: t.is_active ? "#D4EDDA" : "#E1E0EA", color: t.is_active ? "#1E5631" : "#63627A" }}
                    >
                      {t.is_active ? "Active" : "Inactive"}
                    </button>
                    <button
                      className="dc-btn"
                      onClick={() => startEdit(t)}
                      style={{ background: "#E6E5F0", color: "#33346B", display: "flex", alignItems: "center", gap: 4, padding: "10px 12px" }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="dc-btn"
                      onClick={() => handleDelete(t)}
                      disabled={busyId === t.id}
                      style={{ background: "#FEF2F0", color: "#B5502F", display: "flex", alignItems: "center", gap: 4, padding: "10px 12px" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WithdrawalsPanel() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [otpInputs, setOtpInputs] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  async function load(status = statusFilter) {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminWithdrawals(status);
      setWithdrawals(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.message || "Could not load withdrawals");
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  async function handleApprove(id) {
    setBusyId(id);
    setError("");
    try {
      await approveWithdrawal(id);
      load();
    } catch (e) {
      setError(e.response?.data?.message || "Approval/transfer attempt failed");
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    setBusyId(id);
    setError("");
    try {
      await rejectWithdrawal(id, rejectNote);
      setWithdrawals((prev) => prev.filter((w) => w.id !== id));
      setRejectingId(null);
      setRejectNote("");
    } catch (e) {
      setError(e.response?.data?.message || "Could not reject withdrawal");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePay(id) {
    setBusyId(id);
    setError("");
    try {
      await payWithdrawal(id);
      load();
    } catch (e) {
      setError(e.response?.data?.message || "Retry failed");
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleFinalizeOtp(id) {
    const otp = otpInputs[id];
    if (!otp) return;
    setBusyId(id);
    setError("");
    try {
      await finalizeWithdrawalOtp(id, otp);
      setOtpInputs((prev) => ({ ...prev, [id]: "" }));
      load();
    } catch (e) {
      setError(e.response?.data?.message || "OTP finalization failed");
    } finally {
      setBusyId(null);
    }
  }

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "otp_required", label: "Needs OTP" },
    { value: "failed", label: "Failed" },
    { value: "processing", label: "Processing" },
    { value: "all", label: "All" },
  ];

  const statusBadge = {
    pending: { bg: "#FFF3E0", color: "#B5502F", label: "Pending" },
    otp_required: { bg: "#F3E8FF", color: "#7C3AED", label: "Needs OTP" },
    processing: { bg: "#E0F0FF", color: "#1E6BB5", label: "Processing" },
    failed: { bg: "#FEF2F0", color: "#B5502F", label: "Failed" },
    successful: { bg: "#D4EDDA", color: "#1E5631", label: "Successful" },
    rejected: { bg: "#E1E0EA", color: "#63627A", label: "Rejected" },
    approved: { bg: "#E6E5F0", color: "#33346B", label: "Approved" },
  };

  if (loading) return <p style={styles.hint}>Loading withdrawals…</p>;

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            style={{ ...styles.tabBtn, fontSize: 12, padding: "6px 10px", ...(statusFilter === opt.value ? styles.tabBtnActive : {}) }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {withdrawals.length === 0 ? (
        <p style={styles.hint}>No withdrawals in this state.</p>
      ) : (
        <div style={styles.taskList}>
          {withdrawals.map((w) => {
            const badge = statusBadge[w.status] || { bg: "#E1E0EA", color: "#63627A", label: w.status };
            return (
              <div key={w.id} style={styles.taskCard}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <p style={{ ...styles.subUser, margin: 0 }}>
                      {w.user?.name} <span style={styles.subEmail}>({w.user?.email})</span>
                    </p>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </div>
                  <p style={styles.subTask}>
                    ₦{Number(w.amount).toLocaleString()} — {w.type === "referral" ? "Referral" : "Task"} withdrawal
                  </p>
                  <p style={styles.subDate}>{w.bank_name} · {w.bank_account_number}</p>
                  <p style={styles.subDate}>{new Date(w.created_at).toLocaleString()}</p>
                  {w.admin_note && <p style={styles.error}>{w.admin_note}</p>}

                  {rejectingId === w.id && (
                    <div style={{ marginTop: 10 }}>
                      <input
                        className="dc-input"
                        placeholder="Reason (required)"
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                      />
                    </div>
                  )}

                  {w.status === "otp_required" && (
                    <div style={{ marginTop: 10 }}>
                      <input
                        className="dc-input"
                        placeholder="Enter OTP from Paystack"
                        value={otpInputs[w.id] || ""}
                        onChange={(e) => setOtpInputs((prev) => ({ ...prev, [w.id]: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 6, flexDirection: "column" }}>
                  {w.status === "pending" && rejectingId !== w.id && (
                    <>
                      <button className="dc-btn" onClick={() => handleApprove(w.id)} disabled={busyId === w.id} style={{ background: "#2E9E5B", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <Check size={14} /> {busyId === w.id ? "Processing…" : "Approve & pay"}
                      </button>
                      <button className="dc-btn" onClick={() => setRejectingId(w.id)} disabled={busyId === w.id} style={{ background: "#FEF2F0", color: "#B5502F", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <X size={14} /> Reject
                      </button>
                    </>
                  )}

                  {w.status === "pending" && rejectingId === w.id && (
                    <>
                      <button className="dc-btn" onClick={() => handleReject(w.id)} disabled={busyId === w.id || !rejectNote} style={{ background: "#B5502F", color: "#fff" }}>
                        Confirm reject
                      </button>
                      <button className="dc-btn" onClick={() => setRejectingId(null)} style={{ background: "#E1E0EA", color: "#33346B" }}>
                        Cancel
                      </button>
                    </>
                  )}

                  {(w.status === "failed" || w.status === "approved") && (
                    <button className="dc-btn" onClick={() => handlePay(w.id)} disabled={busyId === w.id} style={{ background: "#33346B", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Landmark size={14} /> {busyId === w.id ? "Retrying…" : "Retry transfer"}
                    </button>
                  )}

                  {w.status === "otp_required" && (
                    <button className="dc-btn" onClick={() => handleFinalizeOtp(w.id)} disabled={busyId === w.id || !otpInputs[w.id]} style={{ background: "#7C3AED", color: "#fff" }}>
                      {busyId === w.id ? "Submitting…" : "Submit OTP"}
                    </button>
                  )}

                  {["processing", "successful", "rejected"].includes(w.status) && (
                    <p style={{ ...styles.hint, margin: 0 }}>No action needed</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { fontFamily: "'Work Sans', sans-serif", background: "#EDEEF2", color: "#1C1B1F", padding: "24px 20px 40px", maxWidth: 760, margin: "0 auto", minHeight: "100%" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 },
  brandRow: { display: "flex", alignItems: "center", gap: 8 },
  wordmark: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17 },
  tabs: { display: "flex", gap: 8, marginBottom: 20 },
  tabBtn: { fontFamily: "'Work Sans', sans-serif", fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 8, border: "1px solid #DEDDE8", background: "#F7F7FB", color: "#63627A", cursor: "pointer" },
  tabBtnActive: { background: "#33346B", color: "#F3F2FA", border: "1px solid #33346B" },
  hint: { fontSize: 13, color: "#63627A" },
  poolHint: { fontSize: 12, color: "#8C8B99", marginBottom: 14, lineHeight: 1.5 },
  error: { fontSize: 13, color: "#B5502F", marginTop: 6, marginBottom: 8 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 },
  subCard: { background: "#F7F7FB", border: "1px solid #DEDDE8", borderRadius: 12, overflow: "hidden" },
  proofImg: { width: "100%", height: 160, objectFit: "cover", display: "block", background: "#E6E5F0" },
  subBody: { padding: 14 },
  subUser: { fontSize: 13, fontWeight: 600, margin: 0 },
  subEmail: { fontWeight: 400, color: "#63627A" },
  subTask: { fontSize: 13, color: "#33346B", fontWeight: 600, margin: "4px 0" },
  subDate: { fontSize: 12, color: "#8C8B99", margin: 0 },
  form: { background: "#F7F7FB", border: "1px solid #DEDDE8", borderRadius: 12, padding: 16, marginBottom: 20 },
  taskList: { display: "flex", flexDirection: "column", gap: 10 },
  taskCard: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "#F0F5F1",border: "1px solid #DEDDE8", borderRadius: 10, padding: "12px 14px", gap: 10 },
  lightboxOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24, cursor: "zoom-out",
  },
  lightboxImg: { maxWidth: "100%", maxHeight: "90vh", borderRadius: 8, cursor: "default" },
  lightboxClose: { position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer" },
};