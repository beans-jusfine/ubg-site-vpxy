# NERO VanillaPXY

NERO-compatible VanillaPXY integration workspace.

This repository includes source adapted from [Portal-NetworkDev/VanilliaPXY](https://github.com/Portal-NetworkDev/VanilliaPXY), with permission from its owner. VanillaPXY remains the upstream project; this repository does not claim original authorship.

## Status

- Upstream VanillaPXY v0.4.0 source imported.
- NERO integration and shared-Wisp compatibility are being implemented.
- DEV integration only; NERO production is not modified.

## Architecture

See [docs/architecture.md](docs/architecture.md) for backend and Wisp integration details.

## Upstream

Original project: https://github.com/Portal-NetworkDev/VanilliaPXY

## Deploying the backend on Render

This repository includes a Render Blueprint at `render.yaml`. It defines the Node 24 web service, uses the existing `/health` endpoint for health checks, and keeps the service on the free plan in the Virginia region.

NERO DEV now uses a separate fork deployment at `https://nero-vanillia-proxy-dev.onrender.com`. The original `https://nero-vanillia-proxy.onrender.com` service remains untouched and continues to use the upstream repository. The Blueprint is named to manage the fork deployment, not the original service.
