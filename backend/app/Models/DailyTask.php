<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyTask extends Model
{
    protected $fillable = ['task_id', 'assignment_date'];

    protected $casts = [
        'assignment_date' => 'date',
    ];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }
}