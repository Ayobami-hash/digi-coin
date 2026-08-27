<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Postgres enums are awkward to extend via Laravel's schema builder,
        // so status becomes a plain string — validated in app code instead.
        // Existing 'pending'/'successful' values remain valid.
        Schema::table('withdrawals', function (Blueprint $table) {
            $table->string('status')->default('pending')->change();
        });

        Schema::table('withdrawals', function (Blueprint $table) {
            $table->string('bank_code')->nullable()->after('bank_name');
            $table->text('admin_note')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('paystack_recipient_code')->nullable();
            $table->string('paystack_transfer_code')->nullable();
            $table->string('paystack_transfer_reference')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('withdrawals', function (Blueprint $table) {
            $table->dropColumn([
                'bank_code', 'admin_note', 'reviewed_at', 'reviewed_by',
                'paystack_recipient_code', 'paystack_transfer_code', 'paystack_transfer_reference',
            ]);
        });
    }
};