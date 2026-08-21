<?php

namespace App\Support;

class Plans
{
    public const ALL = [
        [
            'id' => 'novice', 'name' => 'Novice Plan', 'icon' => 'novice',
            'activation' => 750, 'dailyEarnings' => 300, 'taskWithdrawal' => 9000,
            'referralBonus' => 400, 'referralMinWithdrawal' => 1000,
        ],
        [
            'id' => 'mid', 'name' => 'Mid Plan', 'icon' => 'mid',
            'activation' => 1500, 'dailyEarnings' => 600, 'taskWithdrawal' => 15000,
            'referralBonus' => 800, 'referralMinWithdrawal' => 2000,
        ],
        [
            'id' => 'advanced', 'name' => 'Advanced Plan', 'icon' => 'advanced',
            'activation' => 3000, 'dailyEarnings' => 1200, 'taskWithdrawal' => 25000,
            'referralBonus' => 1500, 'referralMinWithdrawal' => 3000,
        ],
        [
            'id' => 'elite', 'name' => 'Elite Plan', 'icon' => 'elite',
            'activation' => 5000, 'dailyEarnings' => 2000, 'taskWithdrawal' => 40000,
            'referralBonus' => 2500, 'referralMinWithdrawal' => 5000,
        ],
    ];

    public static function find(?string $planId): ?array
    {
        if (!$planId) return null;
        return collect(self::ALL)->firstWhere('id', $planId);
    }
}