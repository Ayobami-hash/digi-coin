<?php

namespace App\Console\Commands;

use App\Models\DailyTask;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Console\Command;

class AssignDailyTask extends Command
{
    protected $signature = 'tasks:assign-daily';
    protected $description = "Pick today's task from the active pool, avoiding recent repeats";

    public function handle(): int
    {
        $today = Carbon::today();

        if (DailyTask::whereDate('assignment_date', $today)->exists()) {
            $this->info("Task already assigned for {$today->toDateString()}.");
            return self::SUCCESS;
        }

        // Avoid repeating a task used in the last 3 days, if enough
        // variety exists in the pool.
        $recentTaskIds = DailyTask::where('assignment_date', '>=', $today->copy()->subDays(3))
            ->pluck('task_id');

        $candidates = Task::where('is_active', true)
            ->whereNotIn('id', $recentTaskIds)
            ->get();

        if ($candidates->isEmpty()) {
            // Pool too small to avoid repeats — just pick from all active tasks.
            $candidates = Task::where('is_active', true)->get();
        }

        if ($candidates->isEmpty()) {
            $this->error('No active tasks in the pool. Add tasks via the admin page first.');
            return self::FAILURE;
        }

        $task = $candidates->random();

        DailyTask::create([
            'task_id' => $task->id,
            'assignment_date' => $today,
        ]);

        $this->info("Assigned task \"{$task->title}\" for {$today->toDateString()}.");
        return self::SUCCESS;
    }
}