# VanillaPXY + NERO architecture review

## Upstream components

The upstream VanillaPXY project currently contains two distinct server-side paths:

1. **HTTP proxy/rewrite backend** — the Node server handles `/vanillia?url=...`, fetches the requested site, rewrites HTML/CSS/JavaScript, and proxies ordinary WebSocket connections through `/ws`.
2. **Wisp transport** — the same server handles WebSocket upgrades at `/wisp/` using `@mercuryworkshop/wisp-js/server`.

The browser runtime and service worker are clients of those routes. They are not a complete standalone proxy by themselves.

## What NERO's existing Wisp service can and cannot do

NERO's existing `wss://ubg-site-wisp.onrender.com/wisp/` endpoint is a Wisp transport endpoint. It can be shared by a compatible browser-side Wisp transport, but it does **not** provide VanillaPXY's HTTP fetch/rewrite routes.

Therefore, pointing VanillaPXY at NERO's Wisp URL does not replace the VanillaPXY backend. The HTTP proxy backend must still run somewhere, or be reimplemented using an environment that supports the required server-side networking and WebSocket behavior.

## Deployment options to evaluate

- **Preferred initial integration:** run the VanillaPXY HTTP backend as a separate service, configure its Wisp transport to use NERO's existing Wisp endpoint only if upstream supports that split cleanly, and load its client runtime from NERO DEV.
- **Single-service alternative:** port the HTTP proxy backend into a NERO-compatible Node service. This is a backend deployment change, not just copying static client files.
- **Cloudflare Pages-only:** static Pages hosting alone cannot run the upstream Node HTTP server. A Worker/other backend implementation would be required and must be validated against streaming, WebSocket, request-size, and rewrite requirements.

## Compatibility and safety checks before integration

- Confirm upstream permission/license before copying or modifying upstream files. The upstream repository currently has no `LICENSE` file and its GitHub repository metadata does not declare a license.
- Confirm the upstream Wisp client/server protocol version against NERO's deployed Wisp server (currently pinned separately for login compatibility).
- Preserve the upstream target-validation and private-network protections. Do not enable private targets in a public proxy.
- Keep the NERO engine selector, default Scramjet behavior, tab lifecycle, and direct-embed exceptions unchanged unless the user requests otherwise.
- Validate cookies, redirects, workers, WebSockets, streaming responses, and service-worker scope in DEV before considering production.

## Current NERO integration points

The DEV app already stores the selected engine and VanillaPXY endpoint separately. Its browser navigation currently opens the VanillaPXY `/vanillia?url=` endpoint directly, while Scramjet uses NERO's own initialized controller and Wisp configuration. This confirms that the current VanillaPXY selection expects a reachable HTTP backend; it is not yet a Wisp-only client engine.

## Next implementation gate

Obtain a license or written permission from the upstream maintainer. After that, import the permitted source into this repository, make the Wisp endpoint configurable without weakening the HTTP backend's protections, then update NERO DEV in a separate single commit and test the DEV deployment. Production remains untouched until explicitly approved.
