<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | FRONTEND_URL can hold one or multiple comma-separated origins, e.g.
    |   FRONTEND_URL=http://localhost:5173
    |   FRONTEND_URL=http://localhost:5173,http://localhost:5174
    |
    | The line below splits that string into a real array so Laravel's
    | HandleCors middleware reflects back only the single origin that
    | matches the incoming request, instead of sending a malformed
    | comma-separated Access-Control-Allow-Origin header.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(array_map('trim', explode(',', env('FRONTEND_URL', '')))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];