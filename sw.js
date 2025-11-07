// Service Worker för PWA-funktionalitet
const CACHE_NAME = 'simple-dynamic-site-v1'
const STATIC_CACHE = 'static-v1'
const API_CACHE = 'api-v1'

// Resurser att cacha
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/posts.html',
  '/contact.html',
  '/post-detail.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/api.js',
  '/manifest.json',
  '/assets/images/omar.jpg'
]

// Installera Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker installing.')
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .catch(error => {
        console.error('Failed to cache static assets:', error)
      })
  )
  // Aktivera omedelbart
  self.skipWaiting()
})

// Aktivera Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker activating.')
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  // Ta kontroll över alla klienter
  self.clients.claim()
})

// Hantera fetch requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Cache-first strategi för statiska resurser
  if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response
          }
          return fetch(event.request)
        })
    )
    return
  }

  // Network-first strategi för API-anrop
  if (url.hostname === 'dummyjson.com') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache API responses för offline-stöd
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(API_CACHE)
              .then(cache => {
                cache.put(event.request, responseClone)
              })
          }
          return response
        })
        .catch(() => {
          // Fallback till cache vid nätverksfel
          return caches.match(event.request)
            .then(response => {
              if (response) {
                return response
              }
              // Returnera offline-sida om tillgänglig
              return caches.match('/index.html')
            })
        })
    )
    return
  }

  // Network-first för andra requests
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        // Fallback till cache
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response
            }
            // Returnera offline-sida
            return caches.match('/index.html')
          })
      })
  )
})

// Hantera push-meddelanden (för framtida användning)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/assets/images/omar.jpg',
      badge: '/assets/images/omar.jpg',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    }
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Hantera notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Notification click received.')
  event.notification.close()

  event.waitUntil(
    clients.openWindow('/')
  )
})