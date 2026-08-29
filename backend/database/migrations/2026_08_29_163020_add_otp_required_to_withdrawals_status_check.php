<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_status_check");

        DB::statement("
            ALTER TABLE withdrawals
            ADD CONSTRAINT withdrawals_status_check
            CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'successful', 'failed', 'otp_required'))
        ");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_status_check");

        DB::statement("
            ALTER TABLE withdrawals
            ADD CONSTRAINT withdrawals_status_check
            CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'successful', 'failed'))
        ");
    }
};