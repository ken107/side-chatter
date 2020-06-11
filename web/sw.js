
self.addEventListener('fetch', event => {
    if (event.request.mode === 'navigate') {
        event.respondWith(async function() {
            const normalizedUrl = new URL(event.request.url);
            normalizedUrl.search = '';

            // Create promises for both the network response,
            // and a copy of the response that can be used in the cache.
            const fetchResponseP = fetch(normalizedUrl);
            const fetchResponseCloneP = fetchResponseP.then(r => r.clone());

            // event.waitUntil() ensures that the service worker is kept alive
            // long enough to complete the cache update.
            event.waitUntil(async function() {
                const cache = await caches.open('main');
                await cache.put(normalizedUrl, await fetchResponseCloneP);
            }());

            // Prefer the cached response, falling back to the fetch response.
            return (await caches.match(normalizedUrl)) || fetchResponseP;
        }());
    }
})
