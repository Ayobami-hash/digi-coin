import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { fetchReferralList } from "../lib/rewardsApi";

export default function ReferralListSection() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchReferralList();
        setReferrals(data || []);
      } catch (err) {
        console.error("Error loading referral list:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={styles.card}>
      <p style={styles.eyebrow}>Your referrals</p>

      {loading ? (
        <p style={styles.hint}>Loading referral history…</p>
      ) : referrals.length === 0 ? (
        <div style={styles.emptyState}>
          <Users size={28} color="#8C8B99" />
          <p style={styles.emptyText}>
            No referrals yet. Share your referral link above to start earning.
          </p>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Date joined</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Bonus</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.id}>
                  <td style={styles.td}>{r.referred_name}</td>
                  <td style={styles.tdMuted}>
                    {new Date(r.created_at).toLocaleDateString(undefined, {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right", fontWeight: 600, color: "#C99A3D" }}>
                    ₦{Number(r.bonus_amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { background: "#F7F7FB", border: "1px solid #DEDDE8", borderRadius: 14, padding: "22px 24px", marginBottom: 16 },
  eyebrow: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.06em",
    textTransform: "uppercase", color: "#63627A", margin: "0 0 12px",
  },
  hint: { fontSize: 13, color: "#63627A", margin: 0, lineHeight: 1.5 },
  emptyState: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    padding: "28px 12px", textAlign: "center",
  },
  emptyText: { fontSize: 13, color: "#8C8B99", margin: 0, maxWidth: 260, lineHeight: 1.5 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    textAlign: "left", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase",
    color: "#8C8B99", fontWeight: 600, padding: "0 0 10px", borderBottom: "1px solid #DEDDE8",
  },
  td: { padding: "10px 0", borderBottom: "1px solid #E1E0EA", color: "#1C1B1F" },
  tdMuted: { padding: "10px 0", borderBottom: "1px solid #E1E0EA", color: "#63627A" },
};