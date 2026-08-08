require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { router: usersRouter } = require("./routes/users");
const { router: paymentsRouter, handleWebhook } = require("./routes/payments");

const app = express();

app.use(cors());

// IMPORTANT: the Stripe webhook needs the raw request body to verify the
// signature, so it must be registered BEFORE express.json() and must not
// use the JSON parser.
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), handleWebhook);

app.use(express.json());

app.use("/api/users", usersRouter);
app.use("/api/payments", paymentsRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`DigiCoin backend running on http://localhost:${PORT}`);
});
