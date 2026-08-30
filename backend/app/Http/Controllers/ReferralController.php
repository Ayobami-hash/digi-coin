<?php

namespace App\Http\Controllers;

use App\Models\Referral;
use App\Models\Withdrawal;
use App\Support\Plans;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReferralController extends Controller
{
    /**
     * Statuses that count as "already spoken for" when calculating
     * how much of a user's referral earnings are still withdrawable.
     */
    private const CLAIMED_STATUSES = ['pending', 'approved', 'processing', 'successful'];

    // GET /api/referrals — list this user's referral history
    public function index(Request $request)
    {
        $user = $request->user();

        $referrals = Referral::where('referrer_id', $user->id)
            ->orderByDesc('created_at')
            ->get(['id', 'referred_name', 'bonus_amount', 'created_at']);

        return response()->json(['referrals' => $referrals]);
    }

    // GET /api/referrals/status
    public function status(Request $request)
    {
        $user = $request->user();
        $plan = Plans::find($user->current_plan);

        $count = Referral::where('referrer_id', $user->id)->count();
        $totalEarned = Referral::where('referrer_id', $user->id)->sum('bonus_amount');
        $available = $this->availableBalance($user->id, $totalEarned);

        // Priority-aware "last withdrawal" pick:
        //   Tier 0 — still in progress (pending/approved/processing/otp_required):
        //            always shown first, since these need the user's attention now.
        //   Tier 1 — successful: wins over any rejected/failed withdrawal,
        //            even an older one, so a manual payout isn't hidden by
        //            a later unrelated rejection.
        //   Tier 2 — rejected/failed: shown only if nothing above exists.
        // Within a tier, the most recent one (by created_at) wins.
        $lastWithdrawal = Withdrawal::where('user_id', $user->id)
            ->where('type', 'referral')
            ->orderByRaw("
                CASE status
                    WHEN 'pending' THEN 0
                    WHEN 'approved' THEN 0
                    WHEN 'processing' THEN 0
                    WHEN 'otp_required' THEN 0
                    WHEN 'successful' THEN 1
                    ELSE 2
                END ASC
            ")
            ->latest()
            ->first();

        return response()->json([
            'plan' => $plan,
            'referralCount' => $count,
            'totalEarned' => (float) $totalEarned,
            'availableBalance' => (float) $available,
            'withdrawUnlocked' => $count >= 3 && !is_null($plan),
            'minimumWithdrawal' => $plan['referralMinWithdrawal'] ?? null,
            'lastWithdrawal' => $lastWithdrawal,
        ]);
    }

    // POST /api/referrals/withdraw
    public function withdraw(Request $request)
    {
        $user = $request->user();
        $plan = Plans::find($user->current_plan);

        if (!$plan) {
            return response()->json(['message' => 'No active plan.'], 422);
        }

        $count = Referral::where('referrer_id', $user->id)->count();
        if ($count < 3) {
            return response()->json(['message' => 'You need at least 3 referrals to withdraw.'], 422);
        }

        $minWithdrawal = $plan['referralMinWithdrawal'] ?? 0.01;

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:' . $minWithdrawal],
            'bank_name' => ['required', 'string', 'max:255'],
            'bank_code' => ['required', 'string', 'max:20'],
            'bank_account_number' => ['required', 'string', 'max:50'],
        ]);

        return DB::transaction(function () use ($user, $data) {
            // Lock this user's referral rows for the duration of the
            // transaction so a concurrent withdrawal request can't read
            // the same "available" balance before this one commits.
            $totalEarned = Referral::where('referrer_id', $user->id)
                ->lockForUpdate()
                ->sum('bonus_amount');

            $available = $this->availableBalance($user->id, $totalEarned);

            if ($data['amount'] > $available) {
                return response()->json([
                    'message' => 'Withdrawal amount exceeds your available referral balance.',
                ], 422);
            }

            $withdrawal = Withdrawal::create([
                'user_id' => $user->id,
                'type' => 'referral',
                'amount' => $data['amount'],
                'bank_name' => $data['bank_name'],
                'bank_code' => $data['bank_code'],
                'bank_account_number' => $data['bank_account_number'],
                'status' => 'pending',
            ]);

            return response()->json(['withdrawal' => $withdrawal]);
        });
    }

    /**
     * Referral earnings still available to withdraw: total bonuses earned
     * minus anything already pending, approved, processing, or paid out.
     */
    private function availableBalance(int $userId, float $totalEarned): float
    {
        $alreadyClaimed = Withdrawal::where('user_id', $userId)
            ->where('type', 'referral')
            ->whereIn('status', self::CLAIMED_STATUSES)
            ->sum('amount');

        return max(0, $totalEarned - $alreadyClaimed);
    }
}