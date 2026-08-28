
export function describeWithdrawalStatus(status) {
  switch (status) {
    case "pending":
      return { label: "Withdrawal pending review", color: "#C99A3D" };
    case "approved":
      return { label: "Approved — payout in progress", color: "#33346B" };
    case "processing":
      return { label: "Payment processing", color: "#33346B" };
    case "otp_required":
      return { label: "Payment processing", color: "#33346B" };
    case "successful":
      return { label: "Withdrawal successful", color: "#1E5631" };
    case "rejected":
      return { label: "Withdrawal rejected", color: "#B5502F" };
    case "failed":
      return { label: "Withdrawal failed — contact support", color: "#B5502F" };
    default:
      return { label: status, color: "#63627A" };
  }
}