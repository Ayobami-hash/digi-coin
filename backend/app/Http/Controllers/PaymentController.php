<?php

namespace App\Http\Controllers;

use App\Support\Plans;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

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

        $user->current_plan = $plan['id'];
        $user->save();

        return response()->json([
            'success' => true,
            'currentPlan' => $plan,
            'tasksLocked' => false,
        ]);
    }
}