import assert from "node:assert/strict";
import test from "node:test";
import { normalizePublicHttpUrl } from "./_public-url-safety.mjs";

test("accepts qualified public web targets and strips fragments", () => {
  assert.deepEqual(normalizePublicHttpUrl("https://example.org/pricing?q=1#private", { httpsOnly: true }), {
    ok: true,
    url: "https://example.org/pricing?q=1",
  });
  assert.equal(normalizePublicHttpUrl("http://subdomain.example.org/path").ok, true);
});

test("commercial intake requires HTTPS and rejects credentials or unsafe ports", () => {
  assert.equal(normalizePublicHttpUrl("http://example.org", { httpsOnly: true }).ok, false);
  assert.equal(normalizePublicHttpUrl("https://user:pass@example.org", { httpsOnly: true }).ok, false);
  assert.equal(normalizePublicHttpUrl("https://example.org:8443", { httpsOnly: true }).ok, false);
});

test("rejects local, link-local, private, documentation, and encoded loopback targets", () => {
  for (const target of [
    "https://localhost",
    "https://service.internal",
    "https://app.local",
    "https://127.0.0.1",
    "https://127.1",
    "https://2130706433",
    "https://10.0.0.2",
    "https://172.16.0.1",
    "https://192.168.1.1",
    "https://169.254.169.254/latest/meta-data",
    "https://100.64.0.1",
    "https://192.0.2.1",
    "https://198.51.100.1",
    "https://203.0.113.1",
    "https://[::1]",
  ]) {
    assert.equal(normalizePublicHttpUrl(target, { httpsOnly: true }).ok, false, target);
  }
});

test("rejects unqualified internal-search-domain names", () => {
  assert.equal(normalizePublicHttpUrl("https://payments").ok, false);
});
