// Keep these in sync with the frontend's TIERS / TASKS arrays.
const TIERS = [
  { threshold: 1, reward: 50, label: "First referral" },
  { threshold: 3, reward: 200, label: "Rising farmer" },
  { threshold: 5, reward: 500, label: "Power farmer" },
  { threshold: 10, reward: 1500, label: "DigiCoin Elite" },
];

const TASKS = [
  { id: "follow", label: "Follow DigiCoin on X", reward: 25 },
  { id: "share", label: "Share your referral link", reward: 25 },
  { id: "post", label: "Post using #DigiCoin", reward: 50 },
  { id: "invite", label: "Tag 3 friends in a comment", reward: 25 },
];

// What paying for Premium unlocks. No payout amounts here on purpose —
// premium is feature access, never a promise of money back.
const PREMIUM_FEATURES = [
  "custom_referral_code",
  "referral_analytics",
  "priority_support_badge",
];

const PREMIUM_PRICE_USD = 9.99;

function referralCredit(referralCount) {
  return TIERS.reduce((sum, t) => (referralCount >= t.threshold ? t.reward : sum), 0);
}

function taskCredit(completedTaskIds) {
  return completedTaskIds.reduce((sum, id) => {
    const task = TASKS.find((t) => t.id === id);
    return sum + (task ? task.reward : 0);
  }, 0);
}

module.exports = { TIERS, TASKS, PREMIUM_FEATURES, PREMIUM_PRICE_USD, referralCredit, taskCredit };
