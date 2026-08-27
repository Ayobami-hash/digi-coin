<?php

namespace App\Http\Controllers;

use App\Models\DailyTask;
use App\Models\Task;
use App\Models\TaskSubmission;
use App\Models\Withdrawal;
use App\Support\Plans;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TaskController extends Controller
{
    // Ensures today has an assigned task even if the scheduler hasn't run
    // yet (useful in local dev without `schedule:work` running).
    private function todaysDailyTask(): ?DailyTask
    {
        $today = Carbon::today();
        $dailyTask = DailyTask::with('task')->whereDate('assignment_date', $today)->first();

        if ($dailyTask) {
            return $dailyTask;
        }

        $task = Task::where('is_active', true)->inRandomOrder()->first();
        if (!$task) {
            return null; // pool is empty
        }

        return DailyTask::create(['task_id' => $task->id, 'assignment_date' => $today])->load('task');
    }

    // GET /api/tasks/status
    public function status(Request $request)
    {
        $user = $request->user();
        $plan = Plans::find($user->current_plan);
        $today = Carbon::today();

        $dailyTask = $this->todaysDailyTask();

        $submission = $dailyTask
            ? TaskSubmission::where('user_id', $user->id)->where('daily_task_id', $dailyTask->id)->first()
            : null;

        // No join needed anymore — reward_amount lives directly on
        // task_submissions, captured at submission time.
        $monthTotal = TaskSubmission::where('user_id', $user->id)
            ->where('status', 'approved')
            ->whereYear('created_at', $today->year)
            ->whereMonth('created_at', $today->month)
            ->sum('reward_amount');

        $daysInMonth = $today->daysInMonth;
        $daysLeft = $daysInMonth - $today->day;
        $isPayDay = $today->day === $daysInMonth;

        $lastWithdrawal = Withdrawal::where('user_id', $user->id)
            ->where('type', 'task')
            ->latest()
            ->first();

        return response()->json([
            'plan' => $plan,
            'task' => $dailyTask ? [
                'id' => $dailyTask->task->id,
                'title' => $dailyTask->task->title,
                'description' => $dailyTask->task->description,
                'link' => $dailyTask->task->link,
                // Informational only — what you'd earn if you submit right
                // now, based on your current plan. The actual amount is
                // locked in on the submission itself at submit time.
                'reward_amount' => $plan ? (float) $plan['dailyEarnings'] : null,
            ] : null,
            'submission' => $submission ? [
                'status' => $submission->status,
                'admin_note' => $submission->admin_note,
                'reward_amount' => (float) $submission->reward_amount,
                'proof_url' => Storage::disk('public')->url($submission->proof_path),
                'submitted_at' => $submission->created_at,
            ] : null,
            'monthTotal' => (float) $monthTotal,
            'daysLeftInMonth' => $daysLeft,
            'withdrawUnlocked' => $isPayDay && !is_null($plan),
            'lastWithdrawal' => $lastWithdrawal,
        ]);
    }

       // POST /api/tasks/submit   multipart: proof (file)
    public function submit(Request $request)
    {
        $user = $request->user();
        $plan = Plans::find($user->current_plan);

        if (!$plan) {
            return response()->json(['message' => 'You need an active plan to submit tasks.'], 422);
        }

        $dailyTask = $this->todaysDailyTask();
        if (!$dailyTask) {
            return response()->json(['message' => 'No task is available today.'], 422);
        }

        $request->validate([
            'proof' => ['required', 'file', 'image', 'max:5120'], // 5MB
        ]);

        $existing = TaskSubmission::where('user_id', $user->id)
            ->where('daily_task_id', $dailyTask->id)
            ->first();

        // Block resubmission unless the previous one was rejected.
        if ($existing && $existing->status !== 'rejected') {
            return response()->json(['message' => 'You already submitted proof for today\'s task.'], 422);
        }

        $path = $request->file('proof')->store('task-proofs', 'public');

        // Reward is captured NOW, from the user's current plan — this is
        // what actually gets credited on approval, regardless of any
        // later plan changes.
        $rewardAmount = $plan['dailyEarnings'];

        if ($existing) {
            $existing->update([
                'proof_path' => $path,
                'reward_amount' => $rewardAmount,
                'status' => 'pending',
                'admin_note' => null,
                'reviewed_at' => null,
                'reviewed_by' => null,
            ]);
        } else {
            TaskSubmission::create([
                'user_id' => $user->id,
                'daily_task_id' => $dailyTask->id,
                'task_id' => $dailyTask->task_id,
                'reward_amount' => $rewardAmount,
                'proof_path' => $path,
                'status' => 'pending',
            ]);
        }

        return $this->status($request);
    }

    // POST /api/tasks/withdraw
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

        $monthTotal = TaskSubmission::where('user_id', $user->id)
            ->where('status', 'approved')
            ->whereYear('created_at', $today->year)
            ->whereMonth('created_at', $today->month)
            ->sum('reward_amount');

        if ($data['amount'] > $monthTotal) {
            return response()->json(['message' => 'Withdrawal amount exceeds your approved task earnings.'], 422);
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