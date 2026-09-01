<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        // SQLite has no ADD CONSTRAINT / DROP CONSTRAINT support and does
        // not enforce this kind of CHECK constraint the way Postgres does.
        // The `status` column is a plain string column either way, so on
        // SQLite (local dev) this migration is a safe no-op — application
        // code is what actually restricts valid status values.
        if ($driver === 'sqlite') {
            return;
        }

        if ($driver === 'mysql') {
            $this->dropMysqlCheckConstraintIfExists('withdrawals', 'withdrawals_status_check');

            DB::statement("
                ALTER TABLE withdrawals
                ADD CONSTRAINT withdrawals_status_check
                CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'successful', 'failed', 'otp_required'))
            ");
            return;
        }

        // Postgres
        DB::statement("ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_status_check");

        DB::statement("
            ALTER TABLE withdrawals
            ADD CONSTRAINT withdrawals_status_check
            CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'successful', 'failed', 'otp_required'))
        ");
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            return;
        }

        if ($driver === 'mysql') {
            $this->dropMysqlCheckConstraintIfExists('withdrawals', 'withdrawals_status_check');

            DB::statement("
                ALTER TABLE withdrawals
                ADD CONSTRAINT withdrawals_status_check
                CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'successful', 'failed'))
            ");
            return;
        }

        // Postgres
        DB::statement("ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_status_check");

        DB::statement("
            ALTER TABLE withdrawals
            ADD CONSTRAINT withdrawals_status_check
            CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'successful', 'failed'))
        ");
    }

    /**
     * MySQL doesn't support DROP CONSTRAINT IF EXISTS. Check the
     * information_schema first and only drop if it's actually there.
     */
    private function dropMysqlCheckConstraintIfExists(string $table, string $constraintName): void
    {
        $dbName = DB::getDatabaseName();

        $exists = DB::select("
            SELECT COUNT(*) as count
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = ?
              AND TABLE_NAME = ?
              AND CONSTRAINT_NAME = ?
              AND CONSTRAINT_TYPE = 'CHECK'
        ", [$dbName, $table, $constraintName]);

        if ($exists[0]->count > 0) {
            DB::statement("ALTER TABLE `{$table}` DROP CHECK `{$constraintName}`");
        }
    }
};