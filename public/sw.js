self.addEventListener('fetch', event => {
  // Leave authenticated API requests and external meal photos to the browser.
  if (event.request.mode !== 'navigate' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ankit Fit</title><h1>Ankit Fit is offline</h1><p>Reconnect to load your private dashboard.</p><a href="/">Try again</a></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )));
});
