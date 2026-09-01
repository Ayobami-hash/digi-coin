<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    // GET /api/auth/google/redirect
    public function redirect()
    {
        return Socialite::driver('google')
            ->stateless()
            ->redirect();
    }

    // GET /api/auth/google/callback
    public function callback(Request $request)
    {
        $googleUser = Socialite::driver('google')->stateless()->user();

        $user = User::where('google_id', $googleUser->getId())
            ->orWhere('email', $googleUser->getEmail())
            ->first();

        if ($user) {
            // Link Google to an existing email/password account
            if (! $user->google_id) {
                $user->update([
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                ]);
            }
        } else {
            $user = User::create([
                'name' => $googleUser->getName() ?? $googleUser->getNickname(),
                'email' => $googleUser->getEmail(),
                'google_id' => $googleUser->getId(),
                'avatar' => $googleUser->getAvatar(),
                'password' => null,
                'email_verified_at' => now(),
                'referral_code' => User::generateReferralCode(),
            ]);
        }

        $token = $user->createToken('spa-token')->plainTextToken;

        // Send the user back to the SPA with the token in the URL.
        // The frontend's /auth/callback route reads this param, stores
        // the token, then immediately strips it from the visible URL
        // (e.g. via history.replaceState) so it doesn't linger in
        // browser history or get shared accidentally.
        return redirect(
            config('app.frontend_url') . '/auth/callback?token=' . urlencode($token)
        );
    }
}