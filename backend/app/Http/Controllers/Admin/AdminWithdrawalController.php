<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Withdrawal;
use App\Services\PaystackService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class AdminWithdrawalController extends Controller
{
    public function __construct(private PaystackService $paystack)
    {
    }

    // GET /api/admin/withdrawals?status=pending&type=referral
    public function index(Request $request)
    {
        $status = $request->query('status', 'pending');
        $type = $request->query('type');

        $withdrawals = Withdrawal::with('user:id,name,email')
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($type, fn ($q) => $q->where('type', $type))
            ->orderByDesc('created_at')
            ->paginate(25);

        return response()->json($withdrawals);
    }

    // POST /api/admin/withdrawals/{withdrawal}/approve
    // Approving IS the Paystack action: creates the recipient (if needed)
    // and initiates the transfer immediately. If Paystack requires an OTP
    // to finalize, status becomes 'otp_required' and the admin must call
    // finalize-otp next. Otherwise it becomes 'processing' and the webhook
    // will move it to 'successful'/'failed' when Paystack confirms.
    public function approve(Request $request, Withdrawal $withdrawal)
    {
        $admin = $request->user();

        $locked = DB::transaction(function () use ($withdrawal, $admin) {
            $row = Withdrawal::where('id', $withdrawal->id)->lockForUpdate()->first();

            if ($row->status !== 'pending') {
                return null;
            }

            $row->update([
                'reviewed_at' => now(),
                'reviewed_by' => $admin->id,
            ]);

            return $row;
        });

        if (! $locked) {
            return response()->json(['message' => 'This withdrawal has already been reviewed.'], 422);
        }

        return $this->attemptTransfer($locked);
    }

    // POST /api/admin/withdrawals/{withdrawal}/pay
    // Retry/resend action for a withdrawal stuck in 'failed' after a prior
    // approve attempt errored out (e.g. Paystack was down, insufficient
    // balance at the time, network blip). Re-runs the same transfer logic
    // without re-doing the 'pending' → approved status check.
    public function pay(Request $request, Withdrawal $withdrawal)
    {
        $locked = DB::transaction(function () use ($withdrawal) {
            $row = Withdrawal::where('id', $withdrawal->id)->lockForUpdate()->first();

            if (! in_array($row->status, ['failed', 'approved'], true)) {
                return null;
            }

            return $row;
        });

        if (! $locked) {
            return response()->json(['message' => 'Only failed or approved withdrawals can be retried.'], 422);
        }

        return $this->attemptTransfer($locked);
    }

    // POST /api/admin/withdrawals/{withdrawal}/finalize-otp   { otp }
    // Called when a prior approve/pay attempt returned 'otp_required'.
    // Submits the OTP Paystack sent to your business phone/email to
    // complete the transfer.
    public function finalizeOtp(Request $request, Withdrawal $withdrawal)
    {
        $data = $request->validate([
            'otp' => ['required', 'string'],
        ]);

        if ($withdrawal->status !== 'otp_required') {
            return response()->json(['message' => 'This withdrawal is not awaiting OTP finalization.'], 422);
        }

        if (! $withdrawal->paystack_transfer_code) {
            return response()->json(['message' => 'No transfer code on record for this withdrawal.'], 422);
        }

        try {
            $result = $this->paystack->finalizeTransfer($withdrawal->paystack_transfer_code, $data['otp']);

            $withdrawal->update([
                'status' => 'processing',
                'admin_note' => null,
            ]);

            return response()->json(['withdrawal' => $withdrawal->fresh(), 'paystack' => $result]);
        } catch (RuntimeException $e) {
            Log::error('Paystack OTP finalization failed', [
                'withdrawal_id' => $withdrawal->id,
                'error' => $e->getMessage(),
            ]);

            $withdrawal->update([
                'admin_note' => 'OTP finalization failed: ' . $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'OTP finalization failed.',
                'error' => $e->getMessage(),
            ], 502);
        }
    }

    // POST /api/admin/withdrawals/{withdrawal}/reject
    public function reject(Request $request, Withdrawal $withdrawal)
    {
        $admin = $request->user();

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        return DB::transaction(function () use ($withdrawal, $admin, $data) {
            $locked = Withdrawal::where('id', $withdrawal->id)->lockForUpdate()->first();

            if ($locked->status !== 'pending') {
                return response()->json(['message' => 'This withdrawal has already been reviewed.'], 422);
            }

            $locked->update([
                'status' => 'rejected',
                'admin_note' => $data['reason'],
                'reviewed_at' => now(),
                'reviewed_by' => $admin->id,
            ]);

            // No manual balance restore needed — 'rejected' isn't in
            // CLAIMED_STATUSES, so availableBalance() picks this amount
            // back up automatically.

            return response()->json(['withdrawal' => $locked->fresh()]);
        });
    }

    /**
     * Shared logic for approve() and pay(): create the recipient if
     * needed, initiate the transfer, and handle the three possible
     * outcomes — immediate success, OTP required, or failure.
     */
    private function attemptTransfer(Withdrawal $withdrawal)
    {
        try {
            $recipientCode = $withdrawal->paystack_recipient_code
                ?? $this->paystack->createTransferRecipient(
                    $withdrawal->user->name ?? 'Customer',
                    $withdrawal->bank_account_number,
                    $withdrawal->bank_code,
                );

            $reference = $withdrawal->paystack_transfer_reference ?? (string) Str::uuid();
            $amountInKobo = (int) round($withdrawal->amount * 100);

            $transfer = $this->paystack->initiateTransfer(
                $recipientCode,
                $amountInKobo,
                $reference,
                ucfirst($withdrawal->type) . ' reward withdrawal'
            );

            $paystackStatus = $transfer['status'] ?? null;

            // Paystack returns status "otp" on the transfer object when
            // OTP finalization is required before funds actually move.
            $newStatus = $paystackStatus === 'otp' ? 'otp_required' : 'processing';

            $withdrawal->update([
                'status' => $newStatus,
                'admin_note' => null,
                'paystack_recipient_code' => $recipientCode,
                'paystack_transfer_code' => $transfer['transfer_code'] ?? null,
                'paystack_transfer_reference' => $reference,
            ]);

            return response()->json(['withdrawal' => $withdrawal->fresh()]);
        } catch (RuntimeException $e) {
            Log::error('Paystack transfer attempt failed', [
                'withdrawal_id' => $withdrawal->id,
                'error' => $e->getMessage(),
            ]);

            $withdrawal->update([
                'status' => 'failed',
                'admin_note' => 'Transfer failed: ' . $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Transfer failed. The amount is available for the user again; you can retry via the pay action.',
                'error' => $e->getMessage(),
            ], 502);
        }
    }
}