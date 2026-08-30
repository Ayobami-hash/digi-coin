<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite has no ADD CONSTRAINT / DROP CONSTRAINT support and does
        // not enforce this kind of CHECK constraint the way Postgres does.
        // The `status` column is a plain string column either way, so on
        // SQLite (local dev) this migration is a safe no-op — application
        // code is what actually restricts valid status values.
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_status_check");

        DB::statement("
            ALTER TABLE withdrawals
            ADD CONSTRAINT withdrawals_status_check
            CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'successful', 'failed', 'otp_required'))
        ");
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_status_check");

        DB::statement("
            ALTER TABLE withdrawals
            ADD CONSTRAINT withdrawals_status_check
            CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'successful', 'failed'))
        ");
    }
};