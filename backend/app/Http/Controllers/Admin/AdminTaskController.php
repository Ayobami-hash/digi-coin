<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminTaskController extends Controller
{
    // GET /api/admin/tasks
    public function indexTasks(Request $request)
    {
        $tasks = Task::query()
            ->orderByDesc('created_at')
            ->paginate(25);

        return response()->json([
            'tasks' => $tasks,
        ]);
    }

    // POST /api/admin/tasks
    // NOTE: reward_amount is now optional. Rewards are computed from each
    // user's active plan (daily earnings) at the time they submit, not set
    // per task. This field is kept nullable for backward compatibility with
    // older tasks/rows that may still reference it.
    public function storeTask(Request $request)
    {
        $data = $request->validate([
            'title'         => ['required', 'string', 'max:255'],
            'description'   => ['nullable', 'string', 'max:2000'],
            'link'          => ['nullable', 'url', 'max:2048'],
            'reward_amount' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'is_active'     => ['sometimes', 'boolean'],
        ]);

        $task = Task::create($data);

        return response()->json([
            'task' => $task,
        ], 201);
    }

    // PATCH /api/admin/tasks/{task}
    public function updateTask(Request $request, Task $task)
    {
        $data = $request->validate([
            'title'         => ['sometimes', 'required', 'string', 'max:255'],
            'description'   => ['nullable', 'string', 'max:2000'],
            'link'          => ['nullable', 'url', 'max:2048'],
            'reward_amount' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'is_active'     => ['sometimes', 'boolean'],
        ]);

        $task->update($data);

        return response()->json([
            'task' => $task->fresh(),
        ]);
    }

    // DELETE /api/admin/tasks/{task}
    //
    // Deleting a task previously cascade-deleted every TaskSubmission tied
    // to it (via the task_id/daily_task_id foreign keys), which silently
    // erased users' already-earned, already-approved reward history and
    // pulled real money out of their running balance. To prevent that from
    // ever happening again, a task with any submission history — pending,
    // approved, or rejected — can no longer be hard-deleted. Use
    // updateTask() to set is_active = false instead, which removes it from
    // the daily rotation without touching historical earnings.
    public function destroyTask(Task $task)
    {
        $hasSubmissions = TaskSubmission::where('task_id', $task->id)->exists();

        if ($hasSubmissions) {
            return response()->json([
                'message' => 'This task has submission history and cannot be deleted, since doing so would erase users\' already-earned rewards. Deactivate it instead to remove it from rotation.',
            ], 422);
        }

        $task->delete();

        return response()->json([
            'message' => 'Task deleted successfully.',
        ]);
    }

    // GET /api/admin/task-submissions?status=pending
    public function indexSubmissions(Request $request)
    {
        $status = $request->query('status', 'pending');

        $submissions = TaskSubmission::with(['user:id,name,email', 'task:id,title'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->orderByRaw('admin_note IS NULL') // flagged ones surface first
            ->orderByDesc('created_at')
            ->paginate(25);

        return response()->json($submissions);
    }

    // POST /api/admin/task-submissions/{submission}/approve
    public function approve(Request $request, TaskSubmission $submission)
    {
        $admin = $request->user();

        return DB::transaction(function () use ($submission, $admin) {
            $locked = TaskSubmission::where('id', $submission->id)->lockForUpdate()->first();

            if ($locked->status !== 'pending') {
                return response()->json(['message' => 'This submission has already been reviewed.'], 422);
            }

            $locked->update([
                'status' => 'approved',
                'reviewed_at' => now(),
                'reviewed_by' => $admin->id,
            ]);

            return response()->json(['submission' => $locked->fresh()]);
        });
    }

    // POST /api/admin/task-submissions/{submission}/reject
    public function reject(Request $request, TaskSubmission $submission)
    {
        $admin = $request->user();

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        return DB::transaction(function () use ($submission, $admin, $data) {
            $locked = TaskSubmission::where('id', $submission->id)->lockForUpdate()->first();

            if ($locked->status !== 'pending') {
                return response()->json(['message' => 'This submission has already been reviewed.'], 422);
            }

            $locked->update([
                'status' => 'rejected',
                'admin_note' => $data['reason'],
                'reviewed_at' => now(),
                'reviewed_by' => $admin->id,
            ]);

            return response()->json(['submission' => $locked->fresh()]);
        });
    }
}