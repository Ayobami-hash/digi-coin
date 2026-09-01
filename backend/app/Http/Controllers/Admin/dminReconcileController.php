<?php

// TEMPORARY — add this inside the existing admin-protected group in routes/api.php,
// run it once from the browser (while logged in as an admin), then DELETE this route.
//
// Example placement, inside:
//   Route::middleware('admin')->prefix('admin')->group(function () {
//       ... existing admin routes ...
//       Route::get('/reconcile-payment/{reference}', [AdminReconcileController::class, 'handle']);
//   });

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Plans;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AdminReconcileController extends Controller
{
    // GET /api/admin/reconcile-payment/{reference}
    public function handle(Request $request, string $reference)
    {
        $secretKey = config('services.paystack.secret_key');
        if (! $secretKey) {
            return response()->json(['error' => 'PAYSTACK_SECRET_KEY not configured'], 500);
        }

        $response = Http::withToken($secretKey)
            ->get('https://api.paystack.co/transaction/verify/' . urlencode($reference));

        $body = $response->json();

        if (! $response->successful() || ! ($body['status'] ?? false)) {
            return response()->json(['error' => $body['message'] ?? 'Paystack API call failed'], 500);
        }

        $status = $body['data']['status'] ?? null;
        if ($status !== 'success') {
            return response()->json(['error' => "Transaction status is '{$status}', not 'success'."], 400);
        }

        $metadata = $body['data']['metadata'] ?? [];
        $userId = $metadata['userId'] ?? null;
        $planId = $metadata['planId'] ?? null;

        if (! $userId || ! $planId) {
            return response()->json(['error' => 'No userId/planId in transaction metadata', 'metadata' => $metadata], 400);
        }

        $plan = Plans::find($planId);
        if (! $plan) {
            return response()->json(['error' => "Plan '{$planId}' not found"], 404);
        }

        $user = User::find($userId);
        if (! $user) {
            return response()->json(['error' => "User #{$userId} not found"], 404);
        }

        $amountPaid = ($body['data']['amount'] ?? 0) / 100;

        // Confirmation step: call once with ?confirm=1 after reviewing the
        // dry-run output below, so you don't accidentally apply the wrong
        // transaction on a typo'd reference.
        if (! $request->boolean('confirm')) {
            return response()->json([
                'dry_run' => true,
                'user' => ['id' => $user->id, 'email' => $user->email, 'current_plan' => $user->current_plan],
                'transaction' => ['reference' => $reference, 'amount_paid' => $amountPaid, 'plan_id' => $plan['id']],
                'message' => 'Add &confirm=1 to the URL to actually apply this.',
            ]);
        }

        $user->current_plan = $plan['id'];
        $user->save();

        return response()->json([
            'success' => true,
            'user' => ['id' => $user->id, 'email' => $user->email, 'current_plan' => $user->current_plan],
        ]);
    }
}