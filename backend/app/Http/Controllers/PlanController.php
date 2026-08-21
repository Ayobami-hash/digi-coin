<?php

namespace App\Http\Controllers;

use App\Support\Plans;
use Illuminate\Http\Request;

class PlanController extends Controller
{
    // GET /api/plans
    public function index(Request $request)
    {
        $user = $request->user();
        $currentPlan = $user && $user->current_plan
            ? collect(Plans::ALL)->firstWhere('id', $user->current_plan)
            : null;

        return response()->json([
            'plans' => Plans::ALL,
            'currentPlan' => $currentPlan,
            'tasksLocked' => is_null($currentPlan),
        ]);
    }

    // GET /api/user/{userId}/plan
    public function userPlan(Request $request, $userId)
    {
        $user = $request->user();
        $currentPlan = $user && $user->current_plan
            ? collect(Plans::ALL)->firstWhere('id', $user->current_plan)
            : null;

        return response()->json([
            'userId' => $userId,
            'currentPlan' => $currentPlan,
            'tasksLocked' => is_null($currentPlan),
        ]);
    }
}