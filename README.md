# NERO VanillaPXY

NERO-compatible VanillaPXY integration workspace.

This repository includes source adapted from [Portal-NetworkDev/VanilliaPXY](https://github.com/Portal-NetworkDev/VanilliaPXY), with permission from its owner. VanillaPXY remains the upstream project; this repository does not claim original authorship.

## Status

- Upstream VanillaPXY v0.4.0 source imported with permission and attribution.
- NERO DEV integration is deployed on Render.
- VanillaPXY WebSocket connections use the same Wisp endpoint configured in NERO as Scramjet.
- The fork does not run its own Wisp server; the shared NERO Wisp service is the only relay.
- DEV integration only; NERO production is not modified.

## Architecture

See [docs/architecture.md](docs/architecture.md) for backend and Wisp integration details.

## Upstream

Original project: https://github.com/Portal-NetworkDev/VanilliaPXY

## Shared Wisp

NERO DEV has one Wisp setting shared by Scramjet and VanilliaPXY. The frontend passes that configured URL to the VanillaPXY runtime, which uses Epoxy TLS with Wisp v2 for proxied WebSocket connections. The existing NERO Wisp service runs `@mercuryworkshop/wisp-js` 0.5.2 and supports Wisp v2. Ordinary HTTP page fetches and rewriting still run through the VanillaPXY Node backend; this adapter currently shares Wisp for WebSocket/TCP transport rather than replacing the HTTP rewrite backend.

## Deploying the backend on Render

This repository includes a Render Blueprint at `render.yaml`. It defines the Node 24 web service, uses the existing `/health` endpoint for health checks, and keeps the service on the free plan in the Virginia region.

NERO DEV now uses a separate fork deployment at `https://nero-vanillia-proxy-dev.onrender.com`. The original `https://nero-vanillia-proxy.onrender.com` service remains untouched and continues to use the upstream repository. The Blueprint is named to manage the fork deployment, not the original service.


## Cloudflare Workers migration (DEV)

An isolated Cloudflare Workers entrypoint is available at `src/worker.js` and `wrangler.toml`. It retains the existing rewriting, cookie normalization, redirect validation, and streams non-rewritten responses.

Before deploying:
- Set `ALLOWED_ORIGINS` to the exact NERO DEV origin(s), comma-separated.
- A rate-limit binding caps proxy, favicon, and icon requests at 600/minute per client IP per Cloudflare location (approximate, not globally strict).
- Rewritten HTML/CSS/JavaScript responses are capped at 16 MiB.
- Hostname preflight checks reject DNS answers containing non-public IPv4/IPv6 addresses. The actual request still uses Workers `fetch()` DNS resolution, so this check is not a cryptographic DNS pin and should not be represented as a complete DNS-rebinding guarantee.
- Favicon redirects are not followed.
- Deploy and test separately. Do not switch NERO DEV until cookies, redirects, POST forms, service workers, workers, streaming, and Discord have been tested. The Node backend remains unchanged as fallback.
