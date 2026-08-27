<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Withdrawal extends Model
{
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
}