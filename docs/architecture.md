# NERO VanillaPXY integration architecture

## Upstream components

VanillaPXY has two distinct backend paths:

1. The HTTP proxy/rewrite backend handles `/vanillia?url=...`, fetches target pages, rewrites HTML/CSS/JavaScript, and handles ordinary WebSocket upgrades at `/ws`.
2. Its bundled Wisp server handles Wisp protocol upgrades at `/wisp/`.

The browser runtime is not a standalone proxy backend. It expects the HTTP backend routes to be available.

## Shared NERO Wisp

NERO's existing Wisp service is `wss://ubg-site-wisp.onrender.com/wisp/`. It is a Wisp transport endpoint, not an HTTP proxy endpoint.

VanillaPXY currently wraps target WebSockets by opening `/ws?url=...` against its own HTTP backend. Its runtime forwards an optional `server` query parameter, but the upstream HTTP server does not use that parameter to route `/ws` to a remote Wisp server. Merely adding the Wisp URL to the query therefore does not make VanillaPXY use NERO's Wisp server.

To share NERO Wisp correctly, the browser runtime needs a compatible Wisp client transport implementation and must route proxied WebSocket/TCP traffic through it. The HTTP rewrite/fetch backend remains required unless separately ported to another backend platform.

## Deployment

The VanillaPXY Node backend requires a Node runtime (upstream specifies Node 24.x) and should be deployed separately from static Cloudflare Pages hosting. NERO's frontend can continue to be served from Pages.

## Security and compatibility requirements

- Keep private-IP and DNS-rebinding protections enabled for public deployments.
- Preserve upstream target validation and redirect validation.
- Keep NERO's Scramjet engine as the default and avoid changing production.
- Confirm the Wisp client/server protocol version against the deployed NERO Wisp service before switching WebSocket traffic.
- Test cookies, redirects, service workers, workers, WebSockets, streaming responses, login flows, and ChromeOS performance in DEV.

## Next implementation step

Implement a selectable Wisp client adapter for VanillaPXY and make the relay URL configurable from NERO. Keep the existing `/ws` path as a fallback until the shared-Wisp adapter passes tests.

## Render service configuration

The root `render.yaml` describes the Node 24 backend as a free web service in Virginia. It uses `npm install` and `npm start`, and Render health checks use `/health`. The existing NERO service currently points to the upstream repository; adopting it from this fork must be reviewed in Render before applying.

## Current DEV deployment

The fork is deployed as a separate Render free web service at `https://nero-vanillia-proxy-dev.onrender.com`. NERO DEV has been updated to use this fork endpoint after the service's first deployment succeeded. The original `nero-vanillia-proxy` service remains untouched and still points to the upstream repository.

## Shared-Wisp status

The HTTP proxy backend and the fork deployment are in place, but shared-Wisp transport is not complete yet. The current runtime still sends proxied WebSocket connections to the backend's `/ws` handler, which opens its own upstream WebSocket. The optional `server` query parameter is propagated by the runtime but is not consumed by that handler. Do not describe VanillaPXY as sharing NERO's Wisp server until a compatible TLS-over-Wisp transport replaces that path and is tested.
