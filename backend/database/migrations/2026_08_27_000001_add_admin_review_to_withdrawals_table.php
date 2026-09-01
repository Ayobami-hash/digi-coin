<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('withdrawals', 'status')) {
            Schema::table('withdrawals', function (Blueprint $table) {
                $table->string('status')->default('pending')->change();
            });
        }

        Schema::table('withdrawals', function (Blueprint $table) {
            if (!Schema::hasColumn('withdrawals', 'bank_code')) {
                if (Schema::hasColumn('withdrawals', 'bank_name')) {
                    $table->string('bank_code')->nullable()->after('bank_name');
                } else {
                    $table->string('bank_code')->nullable();
                }
            }
            if (!Schema::hasColumn('withdrawals', 'admin_note')) {
                $table->text('admin_note')->nullable();
            }
            if (!Schema::hasColumn('withdrawals', 'reviewed_at')) {
                $table->timestamp('reviewed_at')->nullable();
            }
            if (!Schema::hasColumn('withdrawals', 'paystack_recipient_code')) {
                $table->string('paystack_recipient_code')->nullable();
            }
            if (!Schema::hasColumn('withdrawals', 'paystack_transfer_code')) {
                $table->string('paystack_transfer_code')->nullable();
            }
            if (!Schema::hasColumn('withdrawals', 'paystack_transfer_reference')) {
                $table->string('paystack_transfer_reference')->nullable();
            }
        });

        if (!Schema::hasColumn('withdrawals', 'reviewed_by')) {
            Schema::table('withdrawals', function (Blueprint $table) {
                $table->foreignId('reviewed_by')->nullable();
            });
        }

        if (!$this->foreignKeyExists('withdrawals', 'withdrawals_reviewed_by_foreign')) {
            Schema::table('withdrawals', function (Blueprint $table) {
                $table->foreign('reviewed_by')
                    ->references('id')->on('users')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::table('withdrawals', function (Blueprint $table) {
            if ($this->foreignKeyExists('withdrawals', 'withdrawals_reviewed_by_foreign')) {
                $table->dropForeign(['reviewed_by']);
            }
        });

        Schema::table('withdrawals', function (Blueprint $table) {
            $columns = [
                'bank_code', 'admin_note', 'reviewed_at', 'reviewed_by',
                'paystack_recipient_code', 'paystack_transfer_code', 'paystack_transfer_reference',
            ];
            foreach ($columns as $column) {
                if (Schema::hasColumn('withdrawals', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    private function foreignKeyExists(string $table, string $constraintName): bool
    {
        $dbName = DB::getDatabaseName();

        $result = DB::select("
            SELECT COUNT(*) as count
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = ?
              AND TABLE_NAME = ?
              AND CONSTRAINT_NAME = ?
              AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        ", [$dbName, $table, $constraintName]);

        return $result[0]->count > 0;
    }
};