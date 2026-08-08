import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory storage for user plans (replace with database later)
const userPlans = {};

// Mock plans data
const PLANS = [
  {
    id: "novice",
    name: "Novice Plan",
    icon: "novice",
    activation: 750,
    dailyEarnings: 300,
    taskWithdrawal: 9000,
    referralBonus: 400,
    minimumWithdrawal: 1000,
  },
  {
    id: "mid",
    name: "Mid Plan",
    icon: "mid",
    activation: 1500,
    dailyEarnings: 600,
    taskWithdrawal: 15000,
    referralBonus: 800,
    minimumWithdrawal: 2000,
  },
  {
    id: "advanced",
    name: "Advanced Plan",
    icon: "advanced",
    activation: 3000,
    dailyEarnings: 1200,
    taskWithdrawal: 25000,
    referralBonus: 1500,
    minimumWithdrawal: 5000,
  },
  {
    id: "elite",
    name: "Elite Plan",
    icon: "elite",
    activation: 5000,
    dailyEarnings: 2000,
    taskWithdrawal: 40000,
    referralBonus: 2500,
    minimumWithdrawal: 10000,
  },
];

// GET /api/plans - Fetch all plans and user's current plan
app.get("/api/plans", (req, res) => {
  const userId = req.query.userId;
  const currentPlanId = userId ? userPlans[userId] : null;
  const currentPlan = currentPlanId ? PLANS.find((p) => p.id === currentPlanId) : null;

  res.json({
    plans: PLANS,
    currentPlan,
    tasksLocked: !Boolean(currentPlan),
  });
});

// POST /api/upgrade-plan - Upgrade user to a new plan
app.post("/api/upgrade-plan", (req, res) => {
  const { userId, planId } = req.body;

  if (!userId || !planId) {
    return res.status(400).json({ error: "userId and planId are required" });
  }

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) {
    return res.status(404).json({ error: "Plan not found" });
  }

  // Store user's current plan
  userPlans[userId] = planId;

  res.json({
    success: true,
    message: `Upgraded to ${plan.name}`,
    currentPlan: plan,
    tasksLocked: false,
  });
});

// GET /api/user/:userId/plan - Get user's current plan
app.get("/api/user/:userId/plan", (req, res) => {
  const { userId } = req.params;
  const currentPlanId = userPlans[userId];
  const currentPlan = currentPlanId
    ? PLANS.find((p) => p.id === currentPlanId)
    : null;

  res.json({
    userId,
    currentPlan,
    tasksLocked: !Boolean(currentPlan),
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 DigiCoin backend running on http://localhost:${PORT}`);
  console.log(`📊 Plans endpoint: http://localhost:${PORT}/api/plans`);
});
