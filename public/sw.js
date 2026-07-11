const CACHE = 'hkbc-registry-v1'

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  self.clients.claim()
})

// Network-first, no aggressive caching (data must stay fresh)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  )
})
