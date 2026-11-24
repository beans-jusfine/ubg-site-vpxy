# NERO VanillaPXY integration architecture

## Upstream components

VanillaPXY has two distinct backend paths:

1. The HTTP proxy/rewrite backend handles `/vanillia?url=...`, fetches target pages, rewrites HTML/CSS/JavaScript, and handles ordinary WebSocket upgrades at `/ws`.
2. Its bundled Wisp server handles Wisp protocol upgrades at `/wisp/`.

The browser runtime is not a standalone proxy backend. It expects the HTTP backend routes to be available.

## Shared NERO Wisp

NERO's existing Wisp service is `wss://ubg-site-wisp.onrender.com/wisp/`. It is a Wisp transport endpoint, not an HTTP proxy endpoint.

VanillaPXY currently wraps target WebSockets by opening `/ws?url=...` against its own HTTP backend. Its runtime forwards an optional `server` query parameter, but the upstream HTTP server does not use that parameter to route `/ws` to a remote Wisp server. Merely adding the Wisp URL to the query therefore does not make VanillaPXY use NERO's Wisp server.

To share NERO Wisp, the browser runtime uses the `@mercuryworkshop/epoxy-tls` client. It loads the bundled client from `/epoxy/epoxy-bundled.js`, connects to the Wisp URL passed in the `server` query parameter, and routes proxied WebSocket connections through TLS-over-Wisp. The Node HTTP rewrite/fetch backend remains responsible for initial page loads and ordinary HTTP requests.

## Deployment

The VanillaPXY Node backend requires a Node runtime (upstream specifies Node 24.x) and should be deployed separately from static Cloudflare Pages hosting. NERO's frontend can continue to be served from Pages.

## Security and compatibility requirements

- Keep private-IP and DNS-rebinding protections enabled for public deployments.
- Preserve upstream target validation and redirect validation.
- Keep NERO's Scramjet engine as the default and avoid changing production.
- Confirm the deployed NERO Wisp service supports Wisp v2 before enabling the adapter in NERO DEV; keep the local `/ws` route as a fallback when no relay URL is supplied.
- Test cookies, redirects, service workers, workers, WebSockets, streaming responses, login flows, and ChromeOS performance in DEV.

## Adapter implementation status

The TLS-over-Wisp WebSocket adapter is implemented in the browser runtime. NERO supplies its configured Wisp URL as the `server` query parameter. The adapter is not production-verified until WebSocket echo, Discord, and other real-site flows are tested from NERO DEV on ChromeOS.

## Render service configuration

The root `render.yaml` describes the Node 24 backend as a free web service in Virginia. It uses `npm install` and `npm start`, and Render health checks use `/health`. The existing NERO service currently points to the upstream repository; adopting it from this fork must be reviewed in Render before applying.

## Current DEV deployment

The fork is deployed as a separate Render free web service at `https://nero-vanillia-proxy-dev.onrender.com`. NERO DEV has been updated to use this fork endpoint after the service's first deployment succeeded. The original `nero-vanillia-proxy` service remains untouched and still points to the upstream repository.

## Shared-Wisp status

The HTTP proxy backend and the fork deployment are in place, but shared-Wisp transport is not complete yet. The current runtime still sends proxied WebSocket connections to the backend's `/ws` handler, which opens its own upstream WebSocket. The optional `server` query parameter is propagated by the runtime but is not consumed by that handler. Do not describe VanillaPXY as sharing NERO's Wisp server until a compatible TLS-over-Wisp transport replaces that path and is tested.
