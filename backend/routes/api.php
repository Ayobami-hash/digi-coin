<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\ReferralController;
use App\Http\Controllers\Admin\AdminTaskController;
use App\Http\Controllers\BankController;
use App\Http\Controllers\Admin\AdminWithdrawalController;
use App\Http\Controllers\PaystackWebhookController;

// Paystack webhook — no auth, called directly by Paystack's servers.
// Must stay outside all auth:sanctum groups.
Route::post('/webhooks/paystack', [PaystackWebhookController::class, 'handle']);

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
    Route::post('/tasks/submit', [TaskController::class, 'submit']);
    Route::post('/tasks/withdraw', [TaskController::class, 'withdraw']);
    Route::get('/banks', [BankController::class, 'index']);

    // Admin-only routes
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/tasks', [AdminTaskController::class, 'indexTasks']);
        Route::post('/tasks', [AdminTaskController::class, 'storeTask']);
        Route::patch('/tasks/{task}', [AdminTaskController::class, 'updateTask']);
        Route::delete('/tasks/{task}', [AdminTaskController::class, 'destroyTask']);

        Route::get('/task-submissions', [AdminTaskController::class, 'indexSubmissions']);
        Route::post('/task-submissions/{submission}/approve', [AdminTaskController::class, 'approve']);
        Route::post('/task-submissions/{submission}/reject', [AdminTaskController::class, 'reject']);

        Route::get('/withdrawals', [AdminWithdrawalController::class, 'index']);
        Route::post('/withdrawals/{withdrawal}/mark-paid-manually', [AdminWithdrawalController::class, 'markPaidManually']);
        Route::post('/withdrawals/{withdrawal}/approve', [AdminWithdrawalController::class, 'approve']);
        Route::post('/withdrawals/{withdrawal}/reject', [AdminWithdrawalController::class, 'reject']);
        Route::post('/withdrawals/{withdrawal}/pay', [AdminWithdrawalController::class, 'pay']);
        Route::post('/withdrawals/{withdrawal}/finalize-otp', [AdminWithdrawalController::class, 'finalizeOtp']);
    });

    Route::get('/referrals/status', [ReferralController::class, 'status']);
    Route::get('/referrals', [ReferralController::class, 'index']);
    Route::post('/referrals', [ReferralController::class, 'store']);
    Route::post('/referrals/withdraw', [ReferralController::class, 'withdraw']);
});