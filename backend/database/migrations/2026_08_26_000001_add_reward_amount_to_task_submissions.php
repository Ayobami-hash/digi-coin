<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_submissions', function (Blueprint $table) {
            // Captured from the user's plan (dailyEarnings) at the moment
            // they submit — so it reflects whatever plan they were on,
            // not the current task pool definition.
            $table->decimal('reward_amount', 12, 2)->nullable()->default(0)->after('task_id');
        });

        // Backfill existing rows before enforcing not-null
        DB::table('task_submissions')->whereNull('reward_amount')->update(['reward_amount' => 0]);

        Schema::table('task_submissions', function (Blueprint $table) {
            $table->decimal('reward_amount', 12, 2)->nullable(false)->default(0)->change();
        });
    }

    public function down(): void
    {
        Schema::table('task_submissions', function (Blueprint $table) {
            $table->dropColumn('reward_amount');
        });
    }
};