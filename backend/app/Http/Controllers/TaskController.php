<?php

namespace App\Http\Controllers;

use App\Models\DailyTask;
use App\Models\Task;
use App\Models\TaskSubmission;
use App\Models\Withdrawal;
use App\Support\Plans;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TaskController extends Controller
{
    /**
     * Statuses that count as "already spoken for" when calculating
     * how much of a user's approved task earnings are still withdrawable.
     */
    private const CLAIMED_STATUSES = ['pending', 'approved', 'processing', 'successful'];

    private function todaysDailyTask(): ?DailyTask
    {
        $today = Carbon::today();
        $dailyTask = DailyTask::with('task')->whereDate('assignment_date', $today)->first();

        if ($dailyTask) {
            return $dailyTask;
        }

        $task = Task::where('is_active', true)->inRandomOrder()->first();
        if (!$task) {
            return null;
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

        $monthTotal = TaskSubmission::where('user_id', $user->id)
            ->approved()
            ->whereYear('created_at', $today->year)
            ->whereMonth('created_at', $today->month)
            ->sum('reward_amount');

        $totalEarned = TaskSubmission::where('user_id', $user->id)
            ->approved()
            ->sum('reward_amount');

        $available = $this->availableBalance($user->id, $totalEarned);

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
            'totalEarned' => (float) $totalEarned,
            'availableBalance' => (float) $available,
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
            'proof' => ['required', 'file', 'image', 'max:5120'],
        ]);

        // Hash the uploaded file before it moves into storage.
        $proofHash = hash_file('sha256', $request->file('proof')->getRealPath());

        return DB::transaction(function () use ($request, $user, $dailyTask, $plan, $proofHash) {
            // Lock any existing submission row for this user/task so a
            // double-click or retried request can't create two rows or
            // race past the "already submitted" check.
            $existing = TaskSubmission::where('user_id', $user->id)
                ->where('daily_task_id', $dailyTask->id)
                ->lockForUpdate()
                ->first();

            if ($existing && $existing->status !== 'rejected') {
                return response()->json(['message' => 'You already submitted proof for today\'s task.'], 422);
            }

            $path = $request->file('proof')->store('task-proofs', 'public');
            $rewardAmount = $plan['dailyEarnings'];

            $isDuplicate = TaskSubmission::duplicateProofFor(
                $user->id,
                $proofHash,
                $existing?->id
            )->exists();

            $adminNote = $isDuplicate
                ? 'Flagged: matches a previously submitted proof image.'
                : null;

            if ($existing) {
                $existing->update([
                    'proof_path' => $path,
                    'proof_hash' => $proofHash,
                    'reward_amount' => $rewardAmount,
                    'status' => 'pending',
                    'admin_note' => $adminNote,
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
                    'proof_hash' => $proofHash,
                    'status' => 'pending',
                    'admin_note' => $adminNote,
                ]);
            }

            return $this->status($request);
        });
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
            'bank_code' => ['required', 'string', 'max:20'],
            'bank_account_number' => ['required', 'string', 'max:50'],
        ]);

        return DB::transaction(function () use ($user, $data) {
            // Lock this user's approved submissions for the duration of
            // the transaction so a concurrent withdrawal request can't
            // read the same "available" balance before this one commits.
            $totalEarned = TaskSubmission::where('user_id', $user->id)
                ->approved()
                ->lockForUpdate()
                ->sum('reward_amount');

            $available = $this->availableBalance($user->id, $totalEarned);

            if ($data['amount'] > $available) {
                return response()->json([
                    'message' => 'Withdrawal amount exceeds your available task earnings.',
                ], 422);
            }

            $withdrawal = Withdrawal::create([
                'user_id' => $user->id,
                'type' => 'task',
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
     * Task earnings still available to withdraw: total approved reward
     * amounts minus anything already pending, approved, processing, or
     * paid out. Deliberately all-time (rolls over month to month) rather
     * than reset at each month boundary.
     */
    private function availableBalance(int $userId, float $totalEarned): float
    {
        $alreadyClaimed = Withdrawal::where('user_id', $userId)
            ->where('type', 'task')
            ->whereIn('status', self::CLAIMED_STATUSES)
            ->sum('amount');

        return max(0, $totalEarned - $alreadyClaimed);
    }
}