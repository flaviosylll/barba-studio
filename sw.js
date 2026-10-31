const CACHE_NAME = 'barbastudio-v1';
const ASSETS = [
    './',
    './index.html',
    './admin.html',
    './style.css',
    './script.js',
    './logo.png',
    './fundo.png',
    './manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});