// Minimal service worker: makes the app installable and lets the
// last-loaded screen open instantly offline. It does NOT cache or
// serve inspection data — that always comes live from Firestore.
var CACHE_NAME = "vehicle-inspect-shell-v1";
var SHELL_FILES = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  // Never cache/intercept calls to Firebase/Firestore — always go to the network.
  if (req.url.indexOf("googleapis.com") !== -1 || req.url.indexOf("firebaseio.com") !== -1 || req.url.indexOf("gstatic.com") !== -1) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then(function (res) {
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, resClone); });
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (cached) { return cached || caches.match("./index.html"); });
      })
  );
});
