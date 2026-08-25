import { useState, useEffect } from "react";
import { Coins, Check, X, Plus, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import {
  fetchPendingSubmissions, approveSubmission, rejectSubmission,
  fetchAdminTasks, createAdminTask, updateAdminTask, deleteAdminTask,
} from "../lib/rewardsApi";

export default function AdminPage({ onBack }) {
  const [tab, setTab] = useState("submissions"); // "submissions" | "tasks"
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
      </div>

      {tab === "submissions"
        ? <SubmissionsPanel onImageClick={setLightboxUrl} />
        : <TaskPoolPanel />}

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
      setSubmissions(data);
    } catch (e) {
      setError(e.response?.data?.message || "Could not load submissions");
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
                <p style={styles.subUser}>{s.user.name} <span style={styles.subEmail}>({s.user.email})</span></p>
                <p style={styles.subTask}>{s.task.title} — ₦{Number(s.task.reward_amount).toLocaleString()}</p>
                <p style={styles.subDate}>{new Date(s.submitted_at).toLocaleString()}</p>

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
  const [form, setForm] = useState({ title: "", description: "", link: "", reward_amount: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [rowError, setRowError] = useState({}); // { [taskId]: message }
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      setTasks(await fetchAdminTasks());
    } catch (e) {
      console.error(e);
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
      await createAdminTask({ ...form, reward_amount: Number(form.reward_amount) });
      setForm({ title: "", description: "", link: "", reward_amount: "" });
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
      reward_amount: task.reward_amount,
    });
  }

  async function handleSaveEdit(taskId) {
    setBusyId(taskId);
    setRowError((prev) => ({ ...prev, [taskId]: "" }));
    try {
      await updateAdminTask(taskId, { ...editForm, reward_amount: Number(editForm.reward_amount) });
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
          <input className="dc-input" placeholder="Link (optional)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} style={{ marginBottom: 8 }} />
          <input className="dc-input" type="number" placeholder="Reward amount (₦)" value={form.reward_amount} onChange={(e) => setForm({ ...form, reward_amount: e.target.value })} required style={{ marginBottom: 12 }} />
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
                  <input className="dc-input" type="number" placeholder="Reward amount (₦)" value={editForm.reward_amount} onChange={(e) => setEditForm({ ...editForm, reward_amount: e.target.value })} style={{ marginBottom: 8 }} />
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
                    <p style={styles.subTask}>{t.title} — ₦{Number(t.reward_amount).toLocaleString()}</p>
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

const styles = {
  page: { fontFamily: "'Work Sans', sans-serif", background: "#EDEEF2", color: "#1C1B1F", padding: "24px 20px 40px", maxWidth: 760, margin: "0 auto", minHeight: "100%" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 },
  brandRow: { display: "flex", alignItems: "center", gap: 8 },
  wordmark: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17 },
  tabs: { display: "flex", gap: 8, marginBottom: 20 },
  tabBtn: { fontFamily: "'Work Sans', sans-serif", fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 8, border: "1px solid #DEDDE8", background: "#F7F7FB", color: "#63627A", cursor: "pointer" },
  tabBtnActive: { background: "#33346B", color: "#F3F2FA", border: "1px solid #33346B" },
  hint: { fontSize: 13, color: "#63627A" },
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
  taskCard: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "#F7F7FB", border: "1px solid #DEDDE8", borderRadius: 10, padding: "12px 14px", gap: 10 },
  lightboxOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24, cursor: "zoom-out",
  },
  lightboxImg: { maxWidth: "100%", maxHeight: "90vh", borderRadius: 8, cursor: "default" },
  lightboxClose: { position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer" },
};