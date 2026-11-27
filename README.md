# NERO VanillaPXY

Standalone Node.js HTTP host for the VanillaPXY rewrite engine. Designed for Railway.

- `GET /health` reports service health.
- `GET /vanillia?url=https%3A%2F%2Fexample.com` proxies and rewrites a page.
- `PORT` is supplied by Railway.

The service is independent of NERO Wisp. Wisp remains the WebSocket relay for transports that use it.
