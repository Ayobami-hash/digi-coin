<?php

namespace App\Http\Controllers;

use App\Models\Referral;
use App\Support\Plans;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    // POST /api/create-checkout-session   { planId }
    public function createCheckoutSession(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'planId' => ['required', 'string'],
        ]);

        $plan = Plans::find($data['planId']);
        if (!$plan) {
            return response()->json(['error' => 'Plan not found'], 404);
        }

        $secretKey = config('services.paystack.secret_key');
        if (!$secretKey) {
            return response()->json(['error' => 'Paystack is not configured. Set PAYSTACK_SECRET_KEY in .env.'], 500);
        }

        $response = Http::withToken($secretKey)
            ->post('https://api.paystack.co/transaction/initialize', [
                'email' => $user->email,
                'amount' => $plan['activation'] * 100, // Paystack expects kobo
                'currency' => 'NGN',
                'callback_url' => config('app.frontend_url'),
                'metadata' => [
                    'userId' => $user->id,
                    'planId' => $plan['id'],
                ],
            ]);

        if (!$response->successful() || !($response->json('status'))) {
            return response()->json([
                'error' => $response->json('message') ?? 'Could not create Paystack transaction',
            ], 500);
        }

        return response()->json([
            'url' => $response->json('data.authorization_url'),
        ]);
    }

    // GET /api/confirm-checkout?reference=...
    public function confirmCheckout(Request $request)
    {
        $reference = $request->query('reference');
        if (!$reference) {
            return response()->json(['error' => 'reference is required'], 400);
        }

        $secretKey = config('services.paystack.secret_key');
        if (!$secretKey) {
            return response()->json(['error' => 'Paystack is not configured. Set PAYSTACK_SECRET_KEY in .env.'], 500);
        }

        $response = Http::withToken($secretKey)
            ->get('https://api.paystack.co/transaction/verify/' . urlencode($reference));

        $body = $response->json();

        if (!$response->successful() || !($body['status'] ?? false) || ($body['data']['status'] ?? null) !== 'success') {
            return response()->json([
                'error' => $body['message'] ?? 'Payment has not completed',
            ], 400);
        }

        $metadata = $body['data']['metadata'] ?? [];
        $userId = $metadata['userId'] ?? null;
        $planId = $metadata['planId'] ?? null;

        if (!$userId || !$planId) {
            return response()->json(['error' => 'Missing metadata on Paystack transaction'], 400);
        }

        $plan = Plans::find($planId);
        if (!$plan) {
            return response()->json(['error' => 'Plan not found'], 404);
        }

        $user = $request->user();

        // Sanity check: the paying user should match the session user
        if ($user && (int) $user->id !== (int) $userId) {
            return response()->json(['error' => 'Transaction does not belong to the current user'], 403);
        }

        // Capture this BEFORE overwriting current_plan, so we know whether
        // this is genuinely the user's first-ever activation (and
        // therefore whether a pending referral bonus should fire).
        $wasFirstActivation = is_null($user->current_plan);

        $user->current_plan = $plan['id'];
        $user->save();

        // Pay out the referral bonus now — not at signup. This only fires
        // when all of the following hold:
        // 1. The user was referred by someone (referred_by is set), AND
        // 2. This is their first-ever plan activation (prevents repeat
        //    bonuses on renewals/upgrades), AND
        // 3. The referrer currently has an active plan (existing bonus
        //    eligibility rule, unchanged from before).
        if ($wasFirstActivation && $user->referred_by) {
            $referrer = \App\Models\User::find($user->referred_by);

            if (!$referrer) {
                Log::warning('Referral bonus skipped: referrer no longer exists', [
                    'referred_user_id' => $user->id,
                    'referred_by' => $user->referred_by,
                ]);
            } else {
                $referrerPlan = Plans::find($referrer->current_plan);

                if (!$referrerPlan) {
                    Log::warning('Referral bonus skipped: referrer has no active plan', [
                        'referrer_id' => $referrer->id,
                        'referred_user_id' => $user->id,
                    ]);
                } else {
                    Referral::create([
                        'referrer_id' => $referrer->id,
                        'referred_name' => $user->name,
                        'bonus_amount' => $referrerPlan['referralBonus'],
                    ]);

                    Log::info('Referral bonus credited on plan activation', [
                        'referrer_id' => $referrer->id,
                        'referred_user_id' => $user->id,
                        'bonus_amount' => $referrerPlan['referralBonus'],
                    ]);
                }
            }
        }

        return response()->json([
            'success' => true,
            'currentPlan' => $plan,
            'tasksLocked' => false,
        ]);
    }
}