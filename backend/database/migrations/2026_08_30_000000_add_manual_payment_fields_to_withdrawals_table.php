<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('withdrawals', function (Blueprint $table) {
            $table->boolean('paid_manually')->default(false)->after('status');
            $table->string('manual_payment_reference')->nullable()->after('paid_manually');
        });
    }

    public function down(): void
    {
        Schema::table('withdrawals', function (Blueprint $table) {
            $table->dropColumn(['paid_manually', 'manual_payment_reference']);
        });
    }
};