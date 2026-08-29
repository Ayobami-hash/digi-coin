<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_submissions', function (Blueprint $table) {
            $table->string('proof_hash', 64)->nullable()->after('proof_path');
            $table->index(['user_id', 'proof_hash']);
        });
    }

    public function down(): void
    {
        Schema::table('task_submissions', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'proof_hash']);
            $table->dropColumn('proof_hash');
        });
    }
};