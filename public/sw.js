// Service worker. Android will not offer to install a page without one that
// handles fetch — and once it exists, the shell may as well survive a tunnel.
//
// Deliberately conservative: a stale room is worse than a slow one, so only
// Next's content-hashed bundles are served from cache without asking. Anything
// else goes to the network first and only falls back to cache when offline.
// Supabase is never touched here; live data has no business being replayed.

const VERSION = "u-v1";
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => c.add("/")).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // realtime, auth, storage — none of it is ours to cache
  if (url.origin !== self.location.origin) return;

  // hashed bundles and generated icons never change under the same name
  const immutable =
    url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");

  if (immutable) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(SHELL).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && request.mode === "navigate") {
          const copy = res.clone();
          caches.open(PAGES).then((c) => c.put("/", copy));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(request);
        if (hit) return hit;
        // a cold navigation with no network still deserves the shell
        if (request.mode === "navigate") {
          const shell = await caches.match("/");
          if (shell) return shell;
        }
        return Response.error();
      }),
  );
});
