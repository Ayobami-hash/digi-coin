<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_submissions', function (Blueprint $table) {
            $table->foreignId('daily_task_id')
                ->nullable()
                ->after('task_id')
                ->constrained('daily_tasks')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('task_submissions', function (Blueprint $table) {
            $table->dropForeign(['daily_task_id']);
            $table->dropColumn('daily_task_id');
        });
    }
};