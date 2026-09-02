<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Look up the real foreign key constraint name on a given column,
     * since MySQL may not always use Laravel's default naming
     * convention (this differs between environments/history).
     */
    private function findForeignKey(string $table, string $column): ?string
    {
        $result = DB::select("
            SELECT CONSTRAINT_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND COLUMN_NAME = ?
            AND REFERENCED_TABLE_NAME IS NOT NULL
        ", [$table, $column]);

        return $result[0]->CONSTRAINT_NAME ?? null;
    }

    public function up(): void
    {
        $taskIdFk = $this->findForeignKey('task_submissions', 'task_id');
        $dailyTaskIdFk = $this->findForeignKey('task_submissions', 'daily_task_id');

        if ($taskIdFk) {
            Schema::table('task_submissions', function (Blueprint $table) use ($taskIdFk) {
                $table->dropForeign($taskIdFk);
            });
        }

        if ($dailyTaskIdFk) {
            Schema::table('task_submissions', function (Blueprint $table) use ($dailyTaskIdFk) {
                $table->dropForeign($dailyTaskIdFk);
            });
        }

        // Both columns must be nullable before a SET NULL foreign key can
        // be added. daily_task_id was historically created as NOT NULL by
        // an earlier migration, regardless of environment, so this is
        // forced explicitly rather than assumed.
        Schema::table('task_submissions', function (Blueprint $table) {
            $table->foreignId('task_id')->nullable()->change();
            $table->foreignId('daily_task_id')->nullable()->change();
        });

        Schema::table('task_submissions', function (Blueprint $table) {
            $table->foreign('task_id')->references('id')->on('tasks')->nullOnDelete();
            $table->foreign('daily_task_id')->references('id')->on('daily_tasks')->nullOnDelete();
        });
    }

    public function down(): void
    {
        $taskIdFk = $this->findForeignKey('task_submissions', 'task_id');
        $dailyTaskIdFk = $this->findForeignKey('task_submissions', 'daily_task_id');

        if ($taskIdFk) {
            Schema::table('task_submissions', function (Blueprint $table) use ($taskIdFk) {
                $table->dropForeign($taskIdFk);
            });
        }

        if ($dailyTaskIdFk) {
            Schema::table('task_submissions', function (Blueprint $table) use ($dailyTaskIdFk) {
                $table->dropForeign($dailyTaskIdFk);
            });
        }

        Schema::table('task_submissions', function (Blueprint $table) {
            $table->foreign('task_id')->references('id')->on('tasks')->cascadeOnDelete();
            $table->foreign('daily_task_id')->references('id')->on('daily_tasks')->cascadeOnDelete();
        });
    }
};