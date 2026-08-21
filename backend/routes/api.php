<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\ReferralController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

// Protected DigiCoin routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/plans', [PlanController::class, 'index']);
    Route::get('/user/{userId}/plan', [PlanController::class, 'userPlan']);

    Route::post('/create-checkout-session', [PaymentController::class, 'createCheckoutSession']);
    Route::get('/confirm-checkout', [PaymentController::class, 'confirmCheckout']);

    Route::get('/tasks/status', [TaskController::class, 'status']);
    Route::post('/tasks/complete', [TaskController::class, 'complete']);
    Route::post('/tasks/withdraw', [TaskController::class, 'withdraw']);

    Route::get('/referrals/status', [ReferralController::class, 'status']);
    Route::post('/referrals', [ReferralController::class, 'store']);
    Route::post('/referrals/withdraw', [ReferralController::class, 'withdraw']);
});