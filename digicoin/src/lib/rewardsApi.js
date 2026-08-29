import { api } from "../lib/api";

// Small helper: our paginated admin endpoints return Laravel's raw
// paginator shape ({ data: [...], current_page, total, ... }), not a
// custom wrapper key. This unwraps either that shape or a plain array,
// so a backend change in pagination style doesn't silently break callers.
function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

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

export async function withdrawReferralEarnings({ amount, bank_name, bank_code, bank_account_number }) {
  const { data } = await api.post("/api/referrals/withdraw", { amount, bank_name, bank_code, bank_account_number });
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

export async function withdrawTaskEarnings({ amount, bank_name, bank_code, bank_account_number }) {
  const { data } = await api.post("/api/tasks/withdraw", { amount, bank_name, bank_code, bank_account_number });
  return data;
}

// --- Admin: task pool ---
// NOTE: these assume indexTasks/storeTask/updateTask return { tasks: [...] }
// / { task: {...} } wrappers. That controller hasn't been shared yet, so
// verify these keys match what AdminTaskController::indexTasks/storeTask
// /updateTask actually return — if they follow the same raw-paginator or
// bare-model pattern as the other endpoints below, these need the same
// fix applied to fetchPendingSubmissions/fetchAdminWithdrawals.
export async function fetchAdminTasks() {
  const { data } = await api.get("/api/admin/tasks");
  return unwrapList(data.tasks ?? data);
}

export async function createAdminTask({ title, description, link, reward_amount }) {
  const { data } = await api.post("/api/admin/tasks", { title, description, link, reward_amount });
  return data.task ?? data;
}

export async function updateAdminTask(taskId, fields) {
  const { data } = await api.patch(`/api/admin/tasks/${taskId}`, fields);
  return data.task ?? data;
}

export async function deleteAdminTask(taskId) {
  const { data } = await api.delete(`/api/admin/tasks/${taskId}`);
  return data;
}

// --- Admin: submission review ---
export async function fetchPendingSubmissions(status = "pending") {
  const { data } = await api.get("/api/admin/task-submissions", { params: { status } });
  // Backend returns a raw Laravel paginator: { data: [...], total, ... }
  return unwrapList(data);
}

export async function approveSubmission(id) {
  const { data } = await api.post(`/api/admin/task-submissions/${id}/approve`);
  return data.submission;
}

export async function rejectSubmission(id, reason) {
  // Backend validates 'reason', not 'admin_note' — must match exactly.
  const { data } = await api.post(`/api/admin/task-submissions/${id}/reject`, { reason });
  return data.submission;
}

export async function fetchBanks() {
  const { data } = await api.get("/api/banks");
  return data.banks;
}

// --- Admin: withdrawal review + payout ---
export async function fetchAdminWithdrawals(status = "pending") {
  const { data } = await api.get("/api/admin/withdrawals", { params: { status } });
  // Backend returns a raw Laravel paginator: { data: [...], total, ... }
  return unwrapList(data);
}

export async function approveWithdrawal(id) {
  const { data } = await api.post(`/api/admin/withdrawals/${id}/approve`);
  return data.withdrawal;
}

export async function rejectWithdrawal(id, reason) {
  // Backend validates 'reason', not 'admin_note' — must match exactly.
  const { data } = await api.post(`/api/admin/withdrawals/${id}/reject`, { reason });
  return data.withdrawal;
}

export async function payWithdrawal(id) {
  const { data } = await api.post(`/api/admin/withdrawals/${id}/pay`);
  return data.withdrawal;
}

export async function finalizeWithdrawalOtp(id, otp) {
  const { data } = await api.post(`/api/admin/withdrawals/${id}/finalize-otp`, { otp });
  return data.withdrawal;
}