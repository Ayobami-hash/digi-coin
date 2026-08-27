<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Withdrawal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AdminWithdrawalController extends Controller
{
    private function secretKey(): ?string
    {
        return config('services.paystack.secret_key');
    }

    // GET /api/admin/withdrawals?status=pending
    // Pass status=all to see everything, including terminal states.
    public function index(Request $request)
    {
        $status = $request->query('status', 'active');

        $withdrawals = Withdrawal::with('user:id,name,email')
            ->when($status === 'active', fn ($q) => $q->whereIn('status', ['pending', 'approved', 'otp_required', 'processing']))
            ->when(!in_array($status, ['active', 'all']), fn ($q) => $q->where('status', $status))
            ->orderBy('created_at')
            ->get();

        return response()->json(['withdrawals' => $withdrawals]);
    }

    // POST /api/admin/withdrawals/{withdrawal}/approve
    public function approve(Request $request, Withdrawal $withdrawal)
    {
        if ($withdrawal->status !== 'pending') {
            return response()->json(['message' => 'Only pending withdrawals can be approved.'], 422);
        }

        $withdrawal->update([
            'status' => 'approved',
            'admin_note' => null,
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
        ]);

        return response()->json(['withdrawal' => $withdrawal]);
    }

    // POST /api/admin/withdrawals/{withdrawal}/reject   { admin_note? }
    public function reject(Request $request, Withdrawal $withdrawal)
    {
        if (!in_array($withdrawal->status, ['pending', 'approved'])) {
            return response()->json(['message' => 'This withdrawal cannot be rejected.'], 422);
        }

        $data = $request->validate([
            'admin_note' => ['nullable', 'string', 'max:500'],
        ]);

        $withdrawal->update([
            'status' => 'rejected',
            'admin_note' => $data['admin_note'] ?? null,
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
        ]);

        return response()->json(['withdrawal' => $withdrawal]);
    }

    // POST /api/admin/withdrawals/{withdrawal}/pay
    // Creates a Paystack transfer recipient (if needed) and initiates the transfer.
    public function pay(Request $request, Withdrawal $withdrawal)
    {
        if ($withdrawal->status !== 'approved') {
            return response()->json(['message' => 'Only approved withdrawals can be paid.'], 422);
        }

        $secretKey = $this->secretKey();
        if (!$secretKey) {
            return response()->json(['message' => 'Paystack is not configured.'], 500);
        }

        if (!$withdrawal->bank_code) {
            return response()->json([
                'message' => 'This withdrawal has no bank code on file and can\'t be auto-paid. Reject it and ask the user to resubmit with an up-to-date bank selection.',
            ], 422);
        }

        // 1. Create a transfer recipient if we don't already have one on file.
        if (!$withdrawal->paystack_recipient_code) {
            $recipientResponse = Http::withToken($secretKey)->post('https://api.paystack.co/transferrecipient', [
                'type' => 'nuban',
                'name' => $withdrawal->user->name,
                'account_number' => $withdrawal->bank_account_number,
                'bank_code' => $withdrawal->bank_code,
                'currency' => 'NGN',
            ]);

            $recipientBody = $recipientResponse->json();

            if (!$recipientResponse->successful() || !($recipientBody['status'] ?? false)) {
                return response()->json([
                    'message' => $recipientBody['message'] ?? 'Could not verify bank account for transfer.',
                ], 422);
            }

            $withdrawal->paystack_recipient_code = $recipientBody['data']['recipient_code'];
            $withdrawal->save();
        }

        // 2. Initiate the transfer.
        $transferResponse = Http::withToken($secretKey)->post('https://api.paystack.co/transfer', [
            'source' => 'balance',
            'amount' => (int) round($withdrawal->amount * 100), // Paystack expects kobo
            'recipient' => $withdrawal->paystack_recipient_code,
            'reason' => ucfirst($withdrawal->type) . ' earnings withdrawal — DigiCoin',
            'reference' => 'dc_wd_' . $withdrawal->id . '_' . now()->timestamp,
        ]);

        $transferBody = $transferResponse->json();

        if (!$transferResponse->successful() || !($transferBody['status'] ?? false)) {
            $withdrawal->update(['status' => 'failed', 'admin_note' => $transferBody['message'] ?? 'Transfer failed']);
            return response()->json([
                'message' => $transferBody['message'] ?? 'Could not initiate Paystack transfer.',
                'withdrawal' => $withdrawal,
            ], 422);
        }

        $data = $transferBody['data'];
        $withdrawal->paystack_transfer_code = $data['transfer_code'] ?? null;
        $withdrawal->paystack_transfer_reference = $data['reference'] ?? null;

        // Paystack transfers can come back needing an OTP before they
        // finalize, depending on the account's transfer settings.
        $withdrawal->status = match ($data['status'] ?? null) {
            'success' => 'successful',
            'otp' => 'otp_required',
            default => 'processing',
        };

        $withdrawal->save();

        return response()->json(['withdrawal' => $withdrawal]);
    }

    // POST /api/admin/withdrawals/{withdrawal}/finalize-otp   { otp }
    public function finalizeOtp(Request $request, Withdrawal $withdrawal)
    {
        if ($withdrawal->status !== 'otp_required') {
            return response()->json(['message' => 'This withdrawal is not waiting on an OTP.'], 422);
        }

        $data = $request->validate([
            'otp' => ['required', 'string'],
        ]);

        $secretKey = $this->secretKey();

        $response = Http::withToken($secretKey)->post('https://api.paystack.co/transfer/finalize_transfer', [
            'transfer_code' => $withdrawal->paystack_transfer_code,
            'otp' => $data['otp'],
        ]);

        $body = $response->json();

        if (!$response->successful() || !($body['status'] ?? false)) {
            return response()->json(['message' => $body['message'] ?? 'Could not finalize transfer.'], 422);
        }

        $withdrawal->update(['status' => 'successful']);

        return response()->json(['withdrawal' => $withdrawal]);
    }
}