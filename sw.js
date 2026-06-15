const CACHE_NAME = "axiom-reachhub-v1";
const urlsToCache = [
  "./", "./index.html", "./manifest.json",
  "./css/styles.css", "./css/addons.css", "./js/ui.js",
  "./assets/favicon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener("fetch", event => {
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});