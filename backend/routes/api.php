<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\PlanController;

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

    Route::post('/create-checkout-session', function () {
        return response()->json(['message' => 'Not implemented yet'], 501);
    });
    Route::get('/confirm-checkout', function () {
        return response()->json(['message' => 'Not implemented yet'], 501);
    });
});