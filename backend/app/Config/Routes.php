<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */

// --- Zee Education: control-plane platform endpoints -------------------
// Phase P1 / Milestone M1.2.
// /health  : environment-safe health probe. No credentials, no detailed
//            server information, no school or user data.
// /setup   : display-only placeholder for the future per-school installer
//            wizard (Phase P3). Writes nothing.
//
// Both are intentionally unauthenticated so monitoring can reach them.
// Any future endpoint carrying tenant or learner data MUST sit behind
// authentication and server-side tenant resolution (ADR-003).
$routes->get('health', 'Health::index');
$routes->get('setup', 'Setup::index');

$routes->get('/', 'Home::index');
