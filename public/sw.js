// Service Worker для автоматического обновления PWA
const CACHE_NAME = 'smeta-app-cache-v2';
const STATIC_CACHE_NAME = 'smeta-static-v2';
const DYNAMIC_CACHE_NAME = 'smeta-dynamic-v2';

// Статические ресурсы для кэширования
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.webmanifest'
];

// Ресурсы, которые должны всегда обновляться
const ALWAYS_FRESH = [
  '/index.html',
  '/manifest.webmanifest'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('SW: Installing new version...');
  
  event.waitUntil(
    Promise.all([
      // Кэшируем статические ресурсы
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      // Принудительно активируем новый SW
      self.skipWaiting()
    ])
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('SW: Activating new version...');
  
  event.waitUntil(
    Promise.all([
      // Очищаем старые кэши
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
              console.log('SW: Deleting old cache:', key);
              return caches.delete(key);
            }
          })
        );
      }),
      // Берем контроль над всеми клиентами
      self.clients.claim()
    ])
  );
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Пропускаем не-GET запросы
  if (request.method !== 'GET') return;
  
  // Пропускаем запросы к внешним доменам
  if (url.origin !== location.origin) return;
  
  event.respondWith(handleRequest(request));
});

// Стратегия кэширования
async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Для HTML файлов - Network First (всегда проверяем обновления)
  if (request.destination === 'document' || url.pathname === '/') {
    return networkFirst(request);
  }
  
  // Для статических ресурсов - Cache First
  if (isStaticAsset(request)) {
    return cacheFirst(request);
  }
  
  // Для остальных - Stale While Revalidate
  return staleWhileRevalidate(request);
}

// Network First - сначала сеть, потом кэш
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Если получили ответ из сети, обновляем кэш
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('SW: Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Cache First - сначала кэш, потом сеть
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    return new Response('Resource not available', { status: 404 });
  }
}

// Stale While Revalidate - возвращаем кэш, но обновляем в фоне
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Обновляем кэш в фоне
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Игнорируем ошибки сети для фонового обновления
  });
  
  // Возвращаем кэшированный ответ или ждем сеть
  return cachedResponse || fetchPromise;
}

// Проверяем, является ли ресурс статическим
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/);
}

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    checkForUpdates();
  }
});

// Проверка обновлений
async function checkForUpdates() {
  try {
    const response = await fetch('/index.html', { cache: 'no-cache' });
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match('/index.html');
    
    if (cachedResponse) {
      const cachedETag = cachedResponse.headers.get('etag');
      const newETag = response.headers.get('etag');
      
      if (cachedETag !== newETag) {
        console.log('SW: Update available!');
        // Уведомляем клиентов об обновлении
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({ type: 'UPDATE_AVAILABLE' });
        });
      }
    }
  } catch (error) {
    console.log('SW: Error checking for updates:', error);
  }
}
