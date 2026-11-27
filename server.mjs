import http from "node:http";
import { Readable } from "node:stream";
import { handleWorkerRequest } from "./src/worker.js";

const port = Number(process.env.PORT || 8080);
const host = "0.0.0.0";

const server = http.createServer(async (incoming, outgoing) => {
  try {
    const proto = incoming.headers["x-forwarded-proto"]?.split(",")[0] || "https";
    const hostHeader = incoming.headers.host || `localhost:${port}`;
    const url = new URL(incoming.url || "/", `${proto}://${hostHeader}`);
    const headers = new Headers();
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (Array.isArray(value)) for (const item of value) headers.append(name, item);
      else if (value !== undefined) headers.set(name, value);
    }
    const method = incoming.method || "GET";
    const init = { method, headers };
    if (method !== "GET" && method !== "HEAD") {
      init.body = Readable.toWeb(incoming);
      init.duplex = "half";
    }
    const request = new Request(url, init);
    const response = await handleWorkerRequest(request, {
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || ""
    });
    const responseHeaders = {};
    for (const [name, value] of response.headers) responseHeaders[name] = value;
    if (typeof response.headers.getSetCookie === "function") {
      const cookies = response.headers.getSetCookie();
      if (cookies.length) responseHeaders["set-cookie"] = cookies;
    }
    outgoing.writeHead(response.status, responseHeaders);
    if (response.body) Readable.fromWeb(response.body).pipe(outgoing);
    else outgoing.end();
  } catch (error) {
    console.error("request failed", error);
    if (!outgoing.headersSent) outgoing.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    outgoing.end("Internal proxy error");
  }
});

server.listen(port, host, () => console.log(`NERO VanillaPXY listening on ${host}:${port}`));
