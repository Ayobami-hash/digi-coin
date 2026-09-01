<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: add the column only if it doesn't exist yet
        if (!Schema::hasColumn('task_submissions', 'daily_task_id')) {
            Schema::table('task_submissions', function (Blueprint $table) {
                $table->foreignId('daily_task_id')
                    ->nullable()
                    ->after('task_id');
            });
        }

        // Step 2: add the foreign key only if it doesn't exist yet
        if (!$this->foreignKeyExists('task_submissions', 'task_submissions_daily_task_id_foreign')) {
            Schema::table('task_submissions', function (Blueprint $table) {
                $table->foreign('daily_task_id')
                    ->references('id')->on('daily_tasks')
                    ->cascadeOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::table('task_submissions', function (Blueprint $table) {
            if ($this->foreignKeyExists('task_submissions', 'task_submissions_daily_task_id_foreign')) {
                $table->dropForeign(['daily_task_id']);
            }
            if (Schema::hasColumn('task_submissions', 'daily_task_id')) {
                $table->dropColumn('daily_task_id');
            }
        });
    }

    private function foreignKeyExists(string $table, string $constraintName): bool
    {
        $dbName = DB::getDatabaseName();

        $result = DB::select("
            SELECT COUNT(*) as count
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = ?
              AND TABLE_NAME = ?
              AND CONSTRAINT_NAME = ?
              AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        ", [$dbName, $table, $constraintName]);

        return $result[0]->count > 0;
    }
};