<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_completions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('completion_date');
            $table->decimal('amount', 12, 2);
            $table->timestamps();

            // One completion per user per day
            $table->unique(['user_id', 'completion_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_completions');
    }
};