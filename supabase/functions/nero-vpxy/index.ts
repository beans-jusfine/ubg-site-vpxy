import { handleWorkerRequest } from "./src/worker.js";

Deno.serve((request) => handleWorkerRequest(request, {
  ALLOWED_ORIGINS: "https://ubg-site-dev.pages.dev"
}));
