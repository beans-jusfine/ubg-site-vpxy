# NERO VanillaPXY integration architecture

## Upstream components

Upstream VanillaPXY contains two backend paths:

1. The HTTP proxy/rewrite backend handles `/vanillia?url=...`, fetches target pages, rewrites HTML/CSS/JavaScript, and handles ordinary WebSocket upgrades at `/ws`.
2. Upstream can also run a bundled Wisp server at `/wisp/`.

The NERO fork keeps the HTTP backend but removes its own Wisp listener and dependency. The browser runtime is not a standalone proxy backend; it still requires the HTTP backend for page loading and rewriting.

## Shared NERO Wisp

NERO's existing Wisp service is `wss://ubg-site-wisp.onrender.com/wisp/`. It is a Wisp transport endpoint, not an HTTP proxy endpoint.

VanillaPXY currently wraps target WebSockets by opening `/ws?url=...` against its own HTTP backend. Its runtime forwards an optional `server` query parameter, but the upstream HTTP server does not use that parameter to route `/ws` to a remote Wisp server. Merely adding the Wisp URL to the query therefore does not make VanillaPXY use NERO's Wisp server.

To share NERO Wisp, the browser runtime uses the `@mercuryworkshop/epoxy-tls` client. It loads the bundled client from `/epoxy/epoxy-bundled.js`, connects to the Wisp URL passed in the `server` query parameter, and routes proxied WebSocket connections through TLS-over-Wisp. The Node HTTP rewrite/fetch backend remains responsible for initial page loads and ordinary HTTP requests. It retains the legacy `/ws` fallback for cases where no shared Wisp URL is supplied, but its own `/wisp/` listener is removed to avoid maintaining a second relay.

## Deployment

The VanillaPXY Node backend requires a Node runtime (upstream specifies Node 24.x) and is deployed separately from static Cloudflare Pages hosting. NERO's frontend can continue to be served from Pages.

## Security and compatibility requirements

- Keep private-IP and DNS-rebinding protections enabled for public deployments.
- Preserve upstream target validation and redirect validation.
- Keep NERO's Scramjet engine as the default and avoid changing production.
- NERO's pinned `@mercuryworkshop/wisp-js` 0.5.2 server supports Wisp v2; the browser-side Epoxy TLS adapter explicitly requests Wisp v2. Keep the `/ws` fallback for standalone/no-relay use.
- Test cookies, redirects, service workers, workers, WebSockets, streaming responses, login flows, and ChromeOS performance in DEV.

## Shared Wisp configuration

NERO DEV's single Wisp setting is the source of truth. `makeVanilliaUrl()` passes the same `getWisp()` value used by Scramjet through the `server` query parameter. The browser runtime requests Wisp v2 through Epoxy TLS, matching the existing NERO Wisp service's `@mercuryworkshop/wisp-js` 0.5.2 server (which supports Wisp v2 and v1 clients). The fork does not host its own Wisp listener.

## Adapter implementation status

The TLS-over-Wisp WebSocket adapter is implemented in the browser runtime. NERO supplies its configured Wisp URL as the `server` query parameter. The adapter is not production-verified until WebSocket echo, Discord, and other real-site flows are tested from NERO DEV on ChromeOS.

## Render service configuration

The root `render.yaml` describes the Node 24 backend as a free web service in Virginia. It uses `npm install` and `npm start`, and Render health checks use `/health`. The existing NERO service currently points to the upstream repository; adopting it from this fork must be reviewed in Render before applying.

## Current DEV deployment

The fork is deployed as a separate Render free web service at `https://nero-vanillia-proxy-dev.onrender.com`. NERO DEV uses this fork endpoint. The original `nero-vanillia-proxy` service remains untouched and still points to the upstream repository.

## Current status

The shared-Wisp WebSocket adapter is implemented and the fork is deployed. The adapter still needs real-browser validation with WebSocket echo, Discord, and other real-site flows on ChromeOS before it should be considered fully verified. NERO production remains untouched.
