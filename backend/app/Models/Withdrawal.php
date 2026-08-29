<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Withdrawal extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_SUCCESSFUL = 'successful';
    public const STATUS_FAILED = 'failed';
    public const STATUS_OTP_REQUIRED = 'otp_required';

    protected $fillable = [
        'user_id', 'type', 'amount', 'bank_name', 'bank_code', 'bank_account_number', 'status',
        'admin_note', 'reviewed_at', 'reviewed_by',
        'paystack_recipient_code', 'paystack_transfer_code', 'paystack_transfer_reference',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'reviewed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }
}