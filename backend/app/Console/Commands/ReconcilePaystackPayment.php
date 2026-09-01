<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\Plans;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class ReconcilePaystackPayment extends Command
{
    protected $signature = 'payment:reconcile {reference : The Paystack transaction reference}';

    protected $description = 'Manually verify a Paystack transaction and apply its plan to the paying user. Use this for payments that succeeded on Paystack but never got confirmed against the app.';

    public function handle(): int
    {
        $reference = $this->argument('reference');

        $secretKey = config('services.paystack.secret_key');
        if (! $secretKey) {
            $this->error('PAYSTACK_SECRET_KEY is not configured.');
            return self::FAILURE;
        }

        $this->info("Verifying transaction {$reference} with Paystack...");

        $response = Http::withToken($secretKey)
            ->get('https://api.paystack.co/transaction/verify/' . urlencode($reference));

        $body = $response->json();

        if (! $response->successful() || ! ($body['status'] ?? false)) {
            $this->error('Paystack API call failed: ' . ($body['message'] ?? 'unknown error'));
            return self::FAILURE;
        }

        $status = $body['data']['status'] ?? null;
        if ($status !== 'success') {
            $this->error("Transaction status is '{$status}', not 'success'. Nothing to apply.");
            return self::FAILURE;
        }

        $metadata = $body['data']['metadata'] ?? [];
        $userId = $metadata['userId'] ?? null;
        $planId = $metadata['planId'] ?? null;

        if (! $userId || ! $planId) {
            $this->error('Transaction has no userId/planId in its metadata — cannot determine what to apply.');
            $this->line('Raw metadata: ' . json_encode($metadata));
            return self::FAILURE;
        }

        $plan = Plans::find($planId);
        if (! $plan) {
            $this->error("Plan '{$planId}' from transaction metadata was not found in Plans::find().");
            return self::FAILURE;
        }

        $user = User::find($userId);
        if (! $user) {
            $this->error("User #{$userId} from transaction metadata was not found.");
            return self::FAILURE;
        }

        $amountPaid = ($body['data']['amount'] ?? 0) / 100; // kobo -> naira
        $this->line("Transaction: {$user->email} paid ₦{$amountPaid} for plan '{$plan['id']}'.");

        if ($user->current_plan === $plan['id']) {
            $this->warn('User already has this plan applied. No changes made.');
            return self::SUCCESS;
        }

        if (! $this->confirm('Apply this plan to the user now?', true)) {
            $this->line('Cancelled — no changes made.');
            return self::SUCCESS;
        }

        $user->current_plan = $plan['id'];
        $user->save();

        $this->info("Done. {$user->email} is now on plan '{$plan['id']}'.");

        return self::SUCCESS;
    }
}