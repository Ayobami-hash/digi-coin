import { api } from "../lib/api";

// --- Task rewards ---
export async function fetchTaskStatus() {
  const { data } = await api.get("/api/tasks/status");
  return data;
}

export async function completeTask() {
  const { data } = await api.post("/api/tasks/complete");
  return data;
}

export async function withdrawTaskEarnings({ amount, bank_name, bank_account_number }) {
  const { data } = await api.post("/api/tasks/withdraw", { amount, bank_name, bank_account_number });
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