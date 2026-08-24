<?php

namespace App\Http\Controllers;

use App\Models\Referral;
use App\Models\Withdrawal;
use App\Support\Plans;
use Illuminate\Http\Request;

class ReferralController extends Controller
{
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

        $lastWithdrawal = Withdrawal::where('user_id', $user->id)
            ->where('type', 'referral')
            ->latest()
            ->first();

        return response()->json([
            'plan' => $plan,
            'referralCount' => $count,
            'totalEarned' => (float) $totalEarned,
            'withdrawUnlocked' => $count >= 3 && !is_null($plan),
            'minimumWithdrawal' => $plan['referralMinWithdrawal'] ?? null,
            'lastWithdrawal' => $lastWithdrawal,
        ]);
    }

    // POST /api/referrals  { referred_name }
    // Kept for manual/admin use — real referrals now happen automatically
    // via the referral_code field at signup (see AuthController::register).
    public function store(Request $request)
    {
        $user = $request->user();
        $plan = Plans::find($user->current_plan);

        if (!$plan) {
            return response()->json(['message' => 'You need an active plan to earn referral bonuses.'], 422);
        }

        $data = $request->validate([
            'referred_name' => ['required', 'string', 'max:255'],
        ]);

        Referral::create([
            'referrer_id' => $user->id,
            'referred_name' => $data['referred_name'],
            'bonus_amount' => $plan['referralBonus'],
        ]);

        return $this->status($request);
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

        $minWithdrawal = $plan['referralMinWithdrawal'];

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:' . $minWithdrawal],
            'bank_name' => ['required', 'string', 'max:255'],
            'bank_account_number' => ['required', 'string', 'max:50'],
        ]);

        $totalEarned = Referral::where('referrer_id', $user->id)->sum('bonus_amount');

        if ($data['amount'] > $totalEarned) {
            return response()->json(['message' => 'Withdrawal amount exceeds your available referral earnings.'], 422);
        }

        $withdrawal = Withdrawal::create([
            'user_id' => $user->id,
            'type' => 'referral',
            'amount' => $data['amount'],
            'bank_name' => $data['bank_name'],
            'bank_account_number' => $data['bank_account_number'],
            'status' => 'pending',
        ]);

        return response()->json(['withdrawal' => $withdrawal]);
    }
}