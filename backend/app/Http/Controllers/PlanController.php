<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PlanController extends Controller
{
    private const PLANS = [
        ['id' => 'novice', 'name' => 'Novice Plan', 'icon' => 'novice', 'activation' => 750, 'dailyEarnings' => 300, 'taskWithdrawal' => 9000, 'referralBonus' => 400, 'minimumWithdrawal' => 1000],
        ['id' => 'mid', 'name' => 'Mid Plan', 'icon' => 'mid', 'activation' => 1500, 'dailyEarnings' => 600, 'taskWithdrawal' => 15000, 'referralBonus' => 800, 'minimumWithdrawal' => 2000],
        ['id' => 'advanced', 'name' => 'Advanced Plan', 'icon' => 'advanced', 'activation' => 3000, 'dailyEarnings' => 1200, 'taskWithdrawal' => 25000, 'referralBonus' => 1500, 'minimumWithdrawal' => 5000],
        ['id' => 'elite', 'name' => 'Elite Plan', 'icon' => 'elite', 'activation' => 5000, 'dailyEarnings' => 2000, 'taskWithdrawal' => 40000, 'referralBonus' => 2500, 'minimumWithdrawal' => 10000],
    ];

    // GET /api/plans
    public function index(Request $request)
    {
        $user = $request->user();
        $currentPlan = $user && $user->current_plan
            ? collect(self::PLANS)->firstWhere('id', $user->current_plan)
            : null;

        return response()->json([
            'plans' => self::PLANS,
            'currentPlan' => $currentPlan,
            'tasksLocked' => is_null($currentPlan),
        ]);
    }

    // GET /api/user/{userId}/plan
    public function userPlan(Request $request, $userId)
    {
        $user = $request->user();
        $currentPlan = $user && $user->current_plan
            ? collect(self::PLANS)->firstWhere('id', $user->current_plan)
            : null;

        return response()->json([
            'userId' => $userId,
            'currentPlan' => $currentPlan,
            'tasksLocked' => is_null($currentPlan),
        ]);
    }
}