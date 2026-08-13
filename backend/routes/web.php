<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

use App\Http\Controllers\Auth\GoogleController;

Route::get('/api/auth/google/redirect', [GoogleController::class, 'redirect']);
Route::get('/api/auth/google/callback', [GoogleController::class, 'callback']);
