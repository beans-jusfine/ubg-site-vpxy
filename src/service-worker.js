export function serviceWorkerResponse(basePath = "", relayServer = "") {
  const endpoint = relayServer
    ? `${basePath}/vanillia?server=${encodeURIComponent(relayServer)}&url=`
    : `${basePath}/vanillia?url=`;
  const internalPaths = [
    "/service-worker.js", "/favicon", "/api/icon", "/health", "/robots.txt", "/vanillia"
  ].map(path => basePath + path);
  const workerScript = `
const endpoint = ${JSON.stringify(endpoint)};
const target = new URL(self.location.href).searchParams.get("target");
const internalPaths = new Set(${JSON.stringify(internalPaths)});
self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
  const request = event.request;
  if (!target || !/^(?:GET|HEAD)$/i.test(request.method)) return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin && internalPaths.has(url.pathname)) return;
  let upstream;
  try {
    const base = new URL(target);
    upstream = url.origin === self.location.origin
      ? new URL(url.pathname + url.search + url.hash, base).href
      : url.href;
    const upstreamUrl = new URL(upstream);
    const pageHost = base.hostname.toLowerCase();
    const proxyHost = self.location.hostname.toLowerCase();
    if ((pageHost === "roblox.com" || pageHost.endsWith(".roblox.com")) &&
        upstreamUrl.hostname.endsWith("." + proxyHost)) {
      const subdomain = upstreamUrl.hostname.slice(0, -(proxyHost.length + 1));
      if (subdomain && !subdomain.includes(".")) upstreamUrl.hostname = subdomain + ".roblox.com";
    }
    upstream = upstreamUrl.href;
  } catch { return; }
  event.respondWith(fetch(new Request(endpoint + encodeURIComponent(upstream), request)));
});`;
  return new Response(workerScript, {
    status: 200,
    headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-store", "service-worker-allowed": "/" }
  });
}
