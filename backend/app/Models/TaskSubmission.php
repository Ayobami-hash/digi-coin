<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class TaskSubmission extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'user_id', 'daily_task_id', 'task_id', 'reward_amount', 'proof_path',
        'proof_hash', 'status', 'admin_note', 'reviewed_at', 'reviewed_by',
    ];

    protected $casts = [
        'reward_amount' => 'decimal:2',
        'reviewed_at' => 'datetime',
    ];

    // Ensures proof_url is automatically included whenever this model
    // (or a collection of them) is converted to an array/JSON response —
    // no controller changes needed for it to show up in the API output.
    protected $appends = ['proof_url'];

    /**
     * Full, absolute URL for the submitted proof screenshot, built from
     * the stored relative path. Uses asset() (not Storage::url()) so the
     * result includes the app's scheme + host + port from APP_URL —
     * important when the frontend and backend run on different origins
     * (e.g. Vite dev server on :5173, Laravel on :8000), since a
     * host-relative URL would otherwise resolve against the frontend's
     * origin instead of the backend's. Returns null if no proof was
     * submitted, so the frontend can handle that case gracefully.
     */
    public function getProofUrlAttribute(): ?string
    {
        if (!$this->proof_path) {
            return null;
        }

        return asset('storage/' . $this->proof_path);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function dailyTask()
    {
        return $this->belongsTo(DailyTask::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    public function scopeRejected(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_REJECTED);
    }

    /**
     * Other submissions from this same user carrying an identical proof
     * file hash — a strong signal of a recycled/reused screenshot.
     * Excludes the current row itself when it already has an id.
     */
    public function scopeDuplicateProofFor(Builder $query, int $userId, string $proofHash, ?int $excludeId = null): Builder
    {
        return $query->where('user_id', $userId)
            ->where('proof_hash', $proofHash)
            ->when($excludeId, fn (Builder $q) => $q->where('id', '!=', $excludeId));
    }

    public function hasDuplicateProof(): bool
    {
        if (!$this->proof_hash) {
            return false;
        }

        return static::duplicateProofFor($this->user_id, $this->proof_hash, $this->id)->exists();
    }
}