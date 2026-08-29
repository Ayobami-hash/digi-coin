<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class PaystackService
{
    private string $baseUrl;
    private string $secretKey;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.paystack.base_url', 'https://api.paystack.co'), '/');
        $this->secretKey = config('services.paystack.secret_key');
    }

    private function client()
    {
        return Http::withToken($this->secretKey)->baseUrl($this->baseUrl);
    }

    public function createTransferRecipient(string $name, string $accountNumber, string $bankCode): string
    {
        $response = $this->client()->post('/transferrecipient', [
            'type' => 'nuban',
            'name' => $name,
            'account_number' => $accountNumber,
            'bank_code' => $bankCode,
            'currency' => 'NGN',
        ]);

        if (! $response->successful() || ! $response->json('status')) {
            throw new RuntimeException(
                'Paystack recipient creation failed: ' . ($response->json('message') ?? $response->body())
            );
        }

        return $response->json('data.recipient_code');
    }

    public function initiateTransfer(string $recipientCode, int $amountInKobo, string $reference, string $reason = 'Withdrawal'): array
    {
        $response = $this->client()->post('/transfer', [
            'source' => 'balance',
            'amount' => $amountInKobo,
            'recipient' => $recipientCode,
            'reference' => $reference,
            'reason' => $reason,
        ]);

        $body = $response->json();

        if (! $response->successful() || ! ($body['status'] ?? false)) {
            throw new RuntimeException(
                'Paystack transfer initiation failed: ' . ($body['message'] ?? $response->body())
            );
        }

        return $body['data'];
    }

    public function verifyTransfer(string $reference): array
    {
        $response = $this->client()->get("/transfer/verify/{$reference}");

        if (! $response->successful() || ! $response->json('status')) {
            throw new RuntimeException(
                'Paystack transfer verification failed: ' . ($response->json('message') ?? $response->body())
            );
        }

        return $response->json('data');
    }

    public function finalizeTransfer(string $transferCode, string $otp): array
{
    $response = $this->client()->post('/transfer/finalize_transfer', [
        'transfer_code' => $transferCode,
        'otp' => $otp,
    ]);

    $body = $response->json();

    if (! $response->successful() || ! ($body['status'] ?? false)) {
        throw new RuntimeException(
            'Paystack OTP finalization failed: ' . ($body['message'] ?? $response->body())
        );
    }

    return $body['data'];
}

    public function verifyWebhookSignature(string $payload, ?string $signatureHeader): bool
    {
        if (! $signatureHeader) {
            return false;
        }

        $expected = hash_hmac('sha512', $payload, $this->secretKey);

        return hash_equals($expected, $signatureHeader);
    }
}