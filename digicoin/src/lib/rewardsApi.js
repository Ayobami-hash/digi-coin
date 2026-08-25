import { api } from "../lib/api";


export async function completeTask() {
  const { data } = await api.post("/api/tasks/complete");
  return data;
}


// --- Referral rewards ---
export async function fetchReferralStatus() {
  const { data } = await api.get("/api/referrals/status");
  return data;
}

export async function addReferral(referred_name) {
  const { data } = await api.post("/api/referrals", { referred_name });
  return data;
}

export async function withdrawReferralEarnings({ amount, bank_name, bank_account_number }) {
  const { data } = await api.post("/api/referrals/withdraw", { amount, bank_name, bank_account_number });
  return data;
}

export async function fetchReferralList() {
  const { data } = await api.get("/api/referrals");
  return data.referrals;
}
 
// --- Task rewards (submission-based) ---
export async function fetchTaskStatus() {
  const { data } = await api.get("/api/tasks/status");
  return data;
}

export async function submitTaskProof(file) {
  const formData = new FormData();
  formData.append("proof", file);
  const { data } = await api.post("/api/tasks/submit", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function withdrawTaskEarnings({ amount, bank_name, bank_account_number }) {
  const { data } = await api.post("/api/tasks/withdraw", { amount, bank_name, bank_account_number });
  return data;
}

// --- Admin: task pool ---
export async function fetchAdminTasks() {
  const { data } = await api.get("/api/admin/tasks");
  return data.tasks;
}

export async function createAdminTask({ title, description, link, reward_amount }) {
  const { data } = await api.post("/api/admin/tasks", { title, description, link, reward_amount });
  return data.task;
}

export async function updateAdminTask(taskId, fields) {
  const { data } = await api.patch(`/api/admin/tasks/${taskId}`, fields);
  return data.task;
}

// --- Admin: submission review ---
export async function fetchPendingSubmissions(status = "pending") {
  const { data } = await api.get("/api/admin/task-submissions", { params: { status } });
  return data.submissions;
}

export async function approveSubmission(id) {
  const { data } = await api.post(`/api/admin/task-submissions/${id}/approve`);
  return data.submission;
}

export async function rejectSubmission(id, admin_note) {
  const { data } = await api.post(`/api/admin/task-submissions/${id}/reject`, { admin_note });
  return data.submission;
}

export async function deleteAdminTask(taskId) {
  const { data } = await api.delete(`/api/admin/tasks/${taskId}`);
  return data;
}
 