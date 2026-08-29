<?php

namespace App\Http\Controllers;

use App\Models\Withdrawal;
use App\Services\PaystackService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaystackWebhookController extends Controller
{
    /**
     * Once a withdrawal reaches one of these, no webhook should change it
     * further — they're terminal states.
     */
    private const TERMINAL_STATUSES = ['successful', 'failed'];

    public function __construct(private PaystackService $paystack)
    {
    }

    // POST /api/webhooks/paystack
    public function handle(Request $request)
    {
        $signature = $request->header('x-paystack-signature');

        if (! $this->paystack->verifyWebhookSignature($request->getContent(), $signature)) {
            Log::warning('Rejected Paystack webhook with invalid signature.');
            return response()->json(['message' => 'Invalid signature'], 401);
        }

        $event = $request->input('event');
        $data = $request->input('data', []);
        $reference = $data['reference'] ?? null;

        if (! $reference) {
            return response()->json(['message' => 'No reference in payload'], 200);
        }

        if (! in_array($event, ['transfer.success', 'transfer.failed', 'transfer.reversed'], true)) {
            // Acknowledge anything we don't act on (e.g. charge.success from
            // a different part of your app) so Paystack stops retrying it.
            return response()->json(['message' => 'Event ignored'], 200);
        }

        return DB::transaction(function () use ($event, $reference) {
            // Lock the row so a duplicate webhook delivery (Paystack retries
            // on non-2xx or timeout) can't race past the terminal-status
            // check below and double-apply an update.
            $withdrawal = Withdrawal::where('paystack_transfer_reference', $reference)
                ->lockForUpdate()
                ->first();

            if (! $withdrawal) {
                return response()->json(['message' => 'No matching withdrawal'], 200);
            }

            if (in_array($withdrawal->status, self::TERMINAL_STATUSES, true)) {
                // Already finalized — this is a duplicate/retried delivery.
                // Acknowledge without touching anything.
                Log::info('Ignored Paystack webhook for already-terminal withdrawal.', [
                    'withdrawal_id' => $withdrawal->id,
                    'current_status' => $withdrawal->status,
                    'event' => $event,
                ]);
                return response()->json(['message' => 'Already finalized'], 200);
            }

            // At this point status is one of: pending, approved, processing,
            // or otp_required — all valid states to transition FROM,
            // regardless of which one it was in (a transfer can go straight
            // to success/failure even from otp_required, since OTP
            // finalization itself doesn't guarantee the transfer's final
            // outcome — Paystack still confirms via this webhook).
            match ($event) {
                'transfer.success' => $withdrawal->update([
                    'status' => 'successful',
                    'admin_note' => null,
                ]),
                'transfer.failed' => $withdrawal->update([
                    'status' => 'failed',
                    'admin_note' => 'Paystack reported transfer failure.',
                ]),
                'transfer.reversed' => $withdrawal->update([
                    'status' => 'failed',
                    'admin_note' => 'Paystack reversed the transfer.',
                ]),
            };

            Log::info('Withdrawal updated from Paystack webhook.', [
                'withdrawal_id' => $withdrawal->id,
                'event' => $event,
                'new_status' => $withdrawal->status,
            ]);

            return response()->json(['message' => 'ok']);
        });
    }
}