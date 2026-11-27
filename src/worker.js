import { validateTarget, validateRedirect } from "./policy-worker.js";
import { resolveProxyTarget } from "./proxy-target.js";
import { requestHeaders, responseHeaders } from "./headers.js";
import { rewriteCss, rewriteHtml, rewriteWorkerScript } from "./rewriter.js";
import { runtimeScript } from "./runtime.js";
import { serviceWorkerResponse } from "./service-worker.js";
import { adblockerScript } from "./adblocker.js";

const timeout = 30000;
const maxRedirects = 8;
const maxRewriteSize = 16 * 1024 * 1024;
const endpoint = "/vanillia?url=";

function errorResponse(status, message) {
  return new Response(message, { status, headers: {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    "x-robots-tag": "noindex, nofollow, noarchive",
    "access-control-allow-origin": "*"
  }});
}
function headersObject(headers) {
  const result = {};
  for (const [name, value] of headers) result[name] = value;
  return result;
}
function responseHeadersInit(values) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(values)) {
    if (name.toLowerCase() === "set-cookie") {
      for (const cookie of Array.isArray(value) ? value : [value]) headers.append(name, cookie);
    } else {
      headers.set(name, value);
    }
  }
  return headers;
}
function canRewrite(headers) {
  const type = String(headers.get("content-type") || "").toLowerCase();
  return type.includes("text/html") || type.includes("text/css") || type.includes("javascript");
}
function proxyEndpoint(request) {
  return new URL(endpoint, new URL(request.url).origin).href;
}
function proxiedRedirect(location, base, request, redirects) {
  if (redirects >= maxRedirects) return null;
  const absolute = new URL(location, base);
  const destination = new URL(endpoint, new URL(request.url).origin);
  destination.searchParams.set("url", absolute.href);
  destination.searchParams.set("__vanillia_redirects", String(redirects + 1));
  return destination.href;
}
async function readBody(response) {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxRewriteSize) return null;
  const buffer = await response.arrayBuffer();
  return buffer.byteLength > maxRewriteSize ? null : new Uint8Array(buffer);
}
async function proxyRequest(request, target, redirects = 0) {
  if (redirects > maxRedirects) return errorResponse(508, "Too many redirects");
  const allowed = await validateTarget(target.href);
  if (!allowed) return errorResponse(403, "Target is not allowed");
  const headers = requestHeaders(headersObject(request.headers), target);
  headers["accept-encoding"] = "identity";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const upstream = await fetch(target.href, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
      signal: controller.signal
    });
    const location = upstream.headers.get("location");
    const rewrittenResponse = canRewrite(upstream.headers);
    const headersOut = responseHeaders(headersObject(upstream.headers), { rewritten: rewrittenResponse, targetHost: target.hostname });
    if (location) {
      const redirect = await validateRedirect(location, target);
      if (!redirect) return errorResponse(403, "Redirect target is not allowed");
      const nextLocation = proxiedRedirect(location, target, request, redirects);
      if (!nextLocation) return errorResponse(508, "Too many redirects");
      headersOut.location = nextLocation;
    }
    if (!rewrittenResponse || [204, 304].includes(upstream.status)) {
      return new Response(upstream.body, { status: upstream.status, headers: responseHeadersInit(headersOut) });
    }
    const body = await readBody(upstream);
    if (body === null) return errorResponse(413, "Response exceeds rewrite limit");
    const type = String(upstream.headers.get("content-type") || "").toLowerCase();
    const source = new TextDecoder().decode(body);
    const absoluteEndpoint = proxyEndpoint(request);
    const iconUrl = new URL("/favicon", new URL(request.url).origin);
    iconUrl.searchParams.set("url", target.href);
    const iconHref = type.includes("text/html") ? iconUrl.href : "";
    const rewritten = type.includes("text/css")
      ? rewriteCss(source, target.href, absoluteEndpoint)
      : type.includes("javascript")
        ? rewriteWorkerScript(source, target.href, absoluteEndpoint)
        : rewriteHtml(source, target.href, absoluteEndpoint, runtimeScript(absoluteEndpoint, "/service-worker.js", target.href) + adblockerScript(), iconHref);
    delete headersOut["content-length"];
    delete headersOut["content-encoding"];
    return new Response(rewritten, { status: upstream.status, headers: responseHeadersInit(headersOut) });
  } catch (error) {
    return error?.name === "AbortError" ? errorResponse(504, "Upstream request timed out") : errorResponse(502, "Unable to reach upstream");
  } finally {
    clearTimeout(timer);
  }
}
export async function handleWorkerRequest(request, env = {}) {
  const url = new URL(request.url);
  if (url.pathname === "/health") return new Response(JSON.stringify({ status: "ok", version: "0.3.8", runtime: "cloudflare" }), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }});
  if (url.pathname === "/robots.txt") return new Response("User-agent: *\nDisallow: /\n", { headers: { "content-type": "text/plain; charset=utf-8" }});
  if (url.pathname === "/service-worker.js") return serviceWorkerResponse();
  if (request.method !== "OPTIONS" && ["/vanillia", "/favicon", "/api/icon"].includes(url.pathname)) {
    const origin = request.headers.get("Origin");
    const referer = request.headers.get("Referer");
    const allowedOrigins = (env.ALLOWED_ORIGINS || "https://beans.work.gd").split(",").map(value => value.trim()).filter(Boolean);
    if (origin && origin !== url.origin && !allowedOrigins.includes(origin)) return errorResponse(403, "Origin not allowed");
    if (!origin && referer) {
      try { const refOrigin = new URL(referer).origin; if (refOrigin !== url.origin && !allowedOrigins.includes(refOrigin)) return errorResponse(403, "Origin not allowed"); }
      catch { return errorResponse(403, "Origin not allowed"); }
    }
    if (env.RATE_LIMITER) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const result = await env.RATE_LIMITER.limit({ key: ip });
      if (!result.success) return errorResponse(429, "Proxy request limit reached. Try again shortly.");
    }
  }
  if (url.pathname === "/favicon") {
    const rawTarget = url.searchParams.get("url") || (url.searchParams.has("q") ? `https://www.google.com/search?q=${encodeURIComponent(url.searchParams.get("q") || "")}` : null);
  const target = await validateTarget(rawTarget);
    if (!target) return errorResponse(403, "Target is not allowed");
    try {
      const response = await fetch(new URL("/favicon.ico", target.origin), { redirect: "manual", signal: AbortSignal.timeout(timeout) });
      if (response.status >= 300 && response.status < 400) return errorResponse(404, "Website icon not found");
      if (!response.ok) return errorResponse(404, "Website icon not found");
      const headers = new Headers({ "cache-control": "public, max-age=3600", "x-robots-tag": "noindex, nofollow, noarchive", "access-control-allow-origin": "*" });
      const type = response.headers.get("content-type");
      if (type) headers.set("content-type", type);
      return new Response(response.body, { headers });
    } catch { return errorResponse(404, "Website icon not found"); }
  }
  if (url.pathname === "/api/icon") {
    const target = await validateTarget(url.searchParams.get("url"));
    if (!target) return errorResponse(403, "Target is not allowed");
    return new Response(JSON.stringify({ url: target.href, icon: `/favicon?url=${encodeURIComponent(target.href)}` }), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600" }});
  }
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS", "access-control-allow-headers": "*", "access-control-max-age": "86400" }});
  if (url.pathname !== "/vanillia") return errorResponse(404, "Not found");
  const redirectCount = Number(url.searchParams.get("__vanillia_redirects")) || 0;
  if (redirectCount > maxRedirects) return errorResponse(508, "Too many redirects");
  const target = await validateTarget(resolveProxyTarget(url.searchParams));
  if (!target) return errorResponse(403, "Target is not allowed");
  return proxyRequest(request, target, redirectCount);
}
