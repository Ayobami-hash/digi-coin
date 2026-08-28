import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { fetchBanks } from "../lib/rewardsApi";

export default function WithdrawModal({ title, maxAmount, minAmount, onSubmit, onClose, submitting, error }) {
  const [amount, setAmount] = useState(minAmount || "");
  const [bankCode, setBankCode] = useState("");
  const [account, setAccount] = useState("");
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [banksError, setBanksError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchBanks();
        setBanks(data || []);
        if (!data || data.length === 0) {
          setBanksError("No banks available right now — try again shortly.");
        }
      } catch (e) {
        setBanksError("Could not load the bank list. Try again shortly.");
      } finally {
        setBanksLoading(false);
      }
    })();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const bank = banks.find((b) => b.code === bankCode);
    onSubmit({
      amount: Number(amount),
      bank_name: bank?.name || "",
      bank_code: bankCode,
      bank_account_number: account,
    });
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <button onClick={onClose} style={styles.closeBtn}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Withdrawal amount (₦)</label>
          <input
            className="dc-input"
            type="number"
            min={minAmount || 1}
            max={maxAmount}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <p style={styles.hint}>
            {minAmount ? `Min ₦${minAmount.toLocaleString()} · ` : ""}
            Available ₦{maxAmount?.toLocaleString()}
          </p>

          <label style={{ ...styles.label, marginTop: 14 }}>Select bank</label>
          <select
            className="dc-input"
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            required
            disabled={banksLoading || banks.length === 0}
          >
            <option value="" disabled>
              {banksLoading ? "Loading banks…" : "Choose your bank"}
            </option>
            {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>
          {banksError && <p style={styles.error}>{banksError}</p>}

          <label style={{ ...styles.label, marginTop: 14 }}>Account number</label>
          <input
            className="dc-input"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="10-digit account number"
            required
          />

          {error && <p style={styles.error}>{error}</p>}

          <button
            className="dc-btn dc-btn-primary"
            type="submit"
            disabled={submitting || banksLoading || banks.length === 0}
            style={{ width: "100%", marginTop: 18 }}
          >
            {submitting ? "Submitting…" : "Submit withdrawal"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(28,27,31,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20,
  },
  modal: {
    background: "#F7F7FB", borderRadius: 14, padding: "22px 24px",
    maxWidth: 380, width: "100%", border: "1px solid #DEDDE8",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, margin: 0, color: "#33346B" },
  closeBtn: { background: "none", border: "none", cursor: "pointer", color: "#63627A", padding: 4 },
  label: { fontSize: 12, fontWeight: 600, color: "#63627A", display: "block", marginBottom: 6 },
  hint: { fontSize: 12, color: "#8C8B99", marginTop: 6, marginBottom: 0 },
  error: { fontSize: 13, color: "#B5502F", marginTop: 8 },
};