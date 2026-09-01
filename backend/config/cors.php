<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | FRONTEND_URL is the single primary frontend origin, also used
    | elsewhere in the app (e.g. GoogleController's post-login redirect
    | and Paystack's callback_url) — so it must stay ONE URL, not a list.
    |
    | CORS_EXTRA_ORIGINS is an optional comma-separated list of any
    | additional origins that should also be allowed to call the API
    | (e.g. an old Vercel URL kept alive during a domain migration, or
    | local dev ports), without affecting FRONTEND_URL's single-URL use
    | elsewhere in the app. Example:
    |   CORS_EXTRA_ORIGINS=https://old-project.vercel.app,http://localhost:5174
    |
    | Both are merged below into the real array Laravel's HandleCors
    | middleware uses to reflect back only the origin that matches the
    | incoming request, instead of sending a malformed
    | Access-Control-Allow-Origin header.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_map('trim', array_merge(
        [env('FRONTEND_URL', '')],
        explode(',', env('CORS_EXTRA_ORIGINS', ''))
    )))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];