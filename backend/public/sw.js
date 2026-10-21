/* Zee Education service worker - offline shell only. */

const CACHE = 'zee-shell-v2';

// ONLY static, unauthenticated assets are cached.
//
// The application itself is NOT cached, and must never be. /m is rendered per
// signed-in user from that user's OWN school, behind the session, role and
// licence filters. Two reasons make caching it wrong:
//
//   1. It leaks. The Cache API is a single shared store on the device. A
//      cached copy of /m would be handed to the NEXT person who opens the app
//      on the same phone, so one school's students would be shown to another
//      school.
//
//   2. It does not even work. An install-time fetch of /m is made without a
//      session, so the server redirects it to the sign-in page. The cache
//      would hold the sign-in page and then serve THAT in place of the app.
//
// The cache version was bumped from v1 to v2 so that any v1 cache - which
// still holds a copy of the sign-in page - is deleted on activation.
//
// No API response and no authenticated page is ever cached.
const SHELL = ['/manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Never cache the API or any non-GET request.
    if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
        return;
    }

    // Only the static shell is served from the cache. Everything else -
    // including /m, /school and /portal - always goes to the network, so no
    // signed-in page can ever be replayed from a stale cache.
    if (!SHELL.includes(url.pathname)) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((hit) => hit || fetch(event.request))
    );
});
