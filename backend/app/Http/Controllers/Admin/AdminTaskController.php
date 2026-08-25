<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DailyTask;
use App\Models\Task;
use App\Models\TaskSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AdminTaskController extends Controller
{
    // GET /api/admin/tasks
    public function indexTasks()
    {
        return response()->json(['tasks' => Task::orderByDesc('created_at')->get()]);
    }

    // POST /api/admin/tasks
    public function storeTask(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'link' => ['nullable', 'url', 'max:500'],
            'reward_amount' => ['required', 'numeric', 'min:0'],
        ]);

        $task = Task::create($data + ['is_active' => true]);

        return response()->json(['task' => $task], 201);
    }

    // PATCH /api/admin/tasks/{task}
    public function updateTask(Request $request, Task $task)
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'link' => ['sometimes', 'nullable', 'url', 'max:500'],
            'reward_amount' => ['sometimes', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $task->update($data);

        return response()->json(['task' => $task]);
    }

    // DELETE /api/admin/tasks/{task}
    public function destroyTask(Task $task)
    {
        // Deleting would cascade-delete daily_tasks and task_submissions
        // tied to this task — including approved submissions that already
        // count toward someone's earnings. Block that; deactivating
        // (is_active = false) is the safe way to retire a task that's
        // been used.
        $hasHistory = DailyTask::where('task_id', $task->id)->exists()
            || TaskSubmission::where('task_id', $task->id)->exists();

        if ($hasHistory) {
            return response()->json([
                'message' => 'This task has assignment or submission history and can\'t be deleted. Deactivate it instead.',
            ], 422);
        }

        $task->delete();

        return response()->json(['message' => 'Task deleted']);
    }

    // GET /api/admin/task-submissions?status=pending
    public function indexSubmissions(Request $request)
    {
        $status = $request->query('status', 'pending');

        $submissions = TaskSubmission::with(['user:id,name,email', 'task:id,title,reward_amount'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->orderBy('created_at')
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'user' => $s->user,
                'task' => $s->task,
                'status' => $s->status,
                'admin_note' => $s->admin_note,
                'proof_url' => Storage::disk('public')->url($s->proof_path),
                'submitted_at' => $s->created_at,
            ]);

        return response()->json(['submissions' => $submissions]);
    }

    // POST /api/admin/task-submissions/{submission}/approve
    public function approve(Request $request, TaskSubmission $submission)
    {
        $submission->update([
            'status' => 'approved',
            'admin_note' => null,
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
        ]);

        return response()->json(['submission' => $submission]);
    }

    // POST /api/admin/task-submissions/{submission}/reject   { admin_note? }
    public function reject(Request $request, TaskSubmission $submission)
    {
        $data = $request->validate([
            'admin_note' => ['nullable', 'string', 'max:500'],
        ]);

        $submission->update([
            'status' => 'rejected',
            'admin_note' => $data['admin_note'] ?? null,
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
        ]);

        return response()->json(['submission' => $submission]);
    }
}