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
