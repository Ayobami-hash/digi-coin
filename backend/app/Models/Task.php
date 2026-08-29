<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    protected $fillable = ['title', 'description', 'link', 'reward_amount', 'is_active'];

    protected $casts = [
        'is_active'     => 'boolean',
        'reward_amount' => 'decimal:2',
    ];
}