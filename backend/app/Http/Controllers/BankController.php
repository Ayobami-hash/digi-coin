<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class BankController extends Controller
{
    // GET /api/banks
    public function index()
    {
        $banks = Cache::remember('paystack_banks_ng', now()->addDay(), function () {
            $secretKey = config('services.paystack.secret_key');
            if (!$secretKey) {
                return [];
            }

            $response = Http::withToken($secretKey)
                ->get('https://api.paystack.co/bank', ['currency' => 'NGN']);

            $body = $response->json();
            if (!$response->successful() || !($body['status'] ?? false)) {
                return [];
            }

            return collect($body['data'])
                ->map(fn ($b) => ['name' => $b['name'], 'code' => $b['code']])
                ->unique('code')
                ->sortBy('name')
                ->values()
                ->all();
        });

        return response()->json(['banks' => $banks]);
    }
}