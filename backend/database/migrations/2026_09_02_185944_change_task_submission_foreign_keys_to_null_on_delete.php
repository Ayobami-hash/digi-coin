<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_submissions', function (Blueprint $table) {
            $table->dropForeign(['task_id']);
            $table->dropForeign(['daily_task_id']);
        });

        Schema::table('task_submissions', function (Blueprint $table) {
            $table->foreignId('task_id')->nullable()->change();
            $table->foreign('task_id')->references('id')->on('tasks')->nullOnDelete();

            $table->foreign('daily_task_id')->references('id')->on('daily_tasks')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('task_submissions', function (Blueprint $table) {
            $table->dropForeign(['task_id']);
            $table->dropForeign(['daily_task_id']);
        });

        Schema::table('task_submissions', function (Blueprint $table) {
            $table->foreign('task_id')->references('id')->on('tasks')->cascadeOnDelete();
            $table->foreign('daily_task_id')->references('id')->on('daily_tasks')->cascadeOnDelete();
        });
    }
};