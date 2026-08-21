<?php

namespace App\Http\Controllers;

use App\Models\TaskCompletion;
use App\Models\Withdrawal;
use App\Support\Plans;
use Carbon\Carbon;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    // GET /api/tasks/status
    public function status(Request $request)
    {
        $user = $request->user();
        $today = Carbon::today();

        $plan = Plans::find($user->current_plan);

        $monthTotal = TaskCompletion::where('user_id', $user->id)
            ->whereYear('completion_date', $today->year)
            ->whereMonth('completion_date', $today->month)
            ->sum('amount');

        $todayCompleted = TaskCompletion::where('user_id', $user->id)
            ->whereDate('completion_date', $today)
            ->exists();

        $daysInMonth = $today->daysInMonth;
        $daysLeft = $daysInMonth - $today->day;
        $isPayDay = $today->day === $daysInMonth;

        $lastWithdrawal = Withdrawal::where('user_id', $user->id)
            ->where('type', 'task')
            ->latest()
            ->first();

        return response()->json([
            'plan' => $plan,
            'todayCompleted' => $todayCompleted,
            'monthTotal' => (float) $monthTotal,
            'daysLeftInMonth' => $daysLeft,
            'withdrawUnlocked' => $isPayDay && !is_null($plan),
            'lastWithdrawal' => $lastWithdrawal,
        ]);
    }

    // POST /api/tasks/complete
    public function complete(Request $request)
    {
        $user = $request->user();
        $plan = Plans::find($user->current_plan);

        if (!$plan) {
            return response()->json(['message' => 'You need an active plan to complete tasks.'], 422);
        }

        $today = Carbon::today();
        $already = TaskCompletion::where('user_id', $user->id)
            ->whereDate('completion_date', $today)
            ->exists();

        if ($already) {
            return response()->json(['message' => 'Task already completed today.'], 422);
        }

        TaskCompletion::create([
            'user_id' => $user->id,
            'completion_date' => $today,
            'amount' => $plan['dailyEarnings'],
        ]);

        return $this->status($request);
    }

    // POST /api/tasks/withdraw
    // Gated only by pay-day (last day of month) + sufficient balance —
    // the spec doesn't define a minimum withdrawal for task earnings,
    // only for referral earnings.
    public function withdraw(Request $request)
    {
        $user = $request->user();
        $plan = Plans::find($user->current_plan);
        $today = Carbon::today();

        if (!$plan) {
            return response()->json(['message' => 'No active plan.'], 422);
        }

        if ($today->day !== $today->daysInMonth) {
            return response()->json(['message' => 'Withdrawals only open on the last day of the month.'], 422);
        }

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'bank_name' => ['required', 'string', 'max:255'],
            'bank_account_number' => ['required', 'string', 'max:50'],
        ]);

        $monthTotal = TaskCompletion::where('user_id', $user->id)
            ->whereYear('completion_date', $today->year)
            ->whereMonth('completion_date', $today->month)
            ->sum('amount');

        if ($data['amount'] > $monthTotal) {
            return response()->json(['message' => 'Withdrawal amount exceeds your available task earnings.'], 422);
        }

        $withdrawal = Withdrawal::create([
            'user_id' => $user->id,
            'type' => 'task',
            'amount' => $data['amount'],
            'bank_name' => $data['bank_name'],
            'bank_account_number' => $data['bank_account_number'],
            'status' => 'pending',
        ]);

        return response()->json(['withdrawal' => $withdrawal]);
    }
}