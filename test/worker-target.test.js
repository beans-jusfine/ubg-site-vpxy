import test from "node:test";
import assert from "node:assert/strict";
import { isTargetAllowed, parseTarget } from "../src/policy-worker.js";
const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });
test("rejects private IPv4 literals", async () => {
  for (const ip of ["127.0.0.1","10.0.0.1","172.16.0.1","192.168.1.1","169.254.1.1"]) assert.equal(await isTargetAllowed(parseTarget("http://"+ip+"/")), false, ip);
});
test("allows public IPv4 literals", async () => assert.equal(await isTargetAllowed(parseTarget("https://1.1.1.1/")), true));
test("blocks adult domains and local suffixes", async () => {
  for (const host of ["pornhub.com","sub.xvideos.com","router.local","host.internal","foo.localhost"]) assert.equal(await isTargetAllowed(parseTarget("https://"+host+"/")), false, host);
});
test("rejects DNS responses containing private addresses", async () => {
  globalThis.fetch = async input => { const type=Number(new URL(input).searchParams.get("type")); return Response.json({Status:0,Answer:[{type,data:type===1?"93.184.216.34":"fd00::1"}]}); };
  assert.equal(await isTargetAllowed(parseTarget("https://example.com/")), false);
});
test("accepts public DNS responses", async () => {
  globalThis.fetch = async input => { const type=Number(new URL(input).searchParams.get("type")); return Response.json({Status:0,Answer:[{type,data:type===1?"93.184.216.34":"2606:4700:4700::1111"}]}); };
  assert.equal(await isTargetAllowed(parseTarget("https://example.com/")), true);
});
