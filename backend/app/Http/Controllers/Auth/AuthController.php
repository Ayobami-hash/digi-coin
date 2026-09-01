<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Referral;
use App\Models\User;
use App\Support\Plans;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    // POST /api/auth/register
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],
            // Referral code is now a real generated code (see User::generateReferralCode()),
            // not a raw user ID — optional.
            'referral_code' => ['nullable', 'string', 'exists:users,referral_code'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'referral_code' => User::generateReferralCode(),
        ]);

        // If a valid referral code was supplied, credit the referrer —
        // only if the referrer has an active plan (referral bonuses are
        // plan-dependent, same rule as manually recorded referrals).
        //
        // Every outcome (credited, skipped, referrer missing) is logged
        // so a "my referral didn't show up" report can be diagnosed from
        // storage/logs/laravel.log instead of guessing blind.
        if (!empty($data['referral_code'])) {
            $referrer = User::where('referral_code', $data['referral_code'])->first();

            if (!$referrer) {
                // Shouldn't happen given the exists:users,referral_code rule,
                // but logged defensively in case that ever changes.
                Log::warning('Referral signup: referrer not found', [
                    'referral_code' => $data['referral_code'],
                    'new_user_id' => $user->id,
                ]);
            } else {
                $plan = Plans::find($referrer->current_plan);

                if (!$plan) {
                    Log::warning('Referral bonus skipped: referrer has no active plan', [
                        'referrer_id' => $referrer->id,
                        'referrer_current_plan' => $referrer->current_plan,
                        'new_user_id' => $user->id,
                    ]);
                } else {
                    Referral::create([
                        'referrer_id' => $referrer->id,
                        'referred_name' => $user->name,
                        'bonus_amount' => $plan['referralBonus'],
                    ]);

                    Log::info('Referral bonus credited', [
                        'referrer_id' => $referrer->id,
                        'new_user_id' => $user->id,
                        'bonus_amount' => $plan['referralBonus'],
                    ]);
                }
            }
        }

        $token = $user->createToken('spa-token')->plainTextToken;

        return response()->json(['user' => $user, 'token' => $token]);
    }

    // POST /api/auth/login
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        // Account was created via Google — no local password set
        if ($user && is_null($user->password)) {
            return response()->json([
                'message' => 'This account uses Google sign-in. Please continue with Google.',
            ], 422);
        }

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'These credentials do not match our records.',
            ], 422);
        }

        $token = $user->createToken('spa-token')->plainTextToken;

        return response()->json(['user' => $user, 'token' => $token]);
    }

    // POST /api/auth/logout
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    // GET /api/auth/me
    public function me(Request $request)
    {
        return response()->json(['user' => $request->user()]);
    }
}