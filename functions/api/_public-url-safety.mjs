const BLOCKED_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home.arpa",
  ".test",
  ".invalid",
  ".example",
  ".onion",
];

function parseIpv4(hostname) {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
  const octets = parts.map(Number);
  return octets.every((octet) => octet >= 0 && octet <= 255) ? octets : null;
}

function isNonPublicIpv4([a, b, c]) {
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

export function isUnsafePublicHostname(value) {
  const hostname = value.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.includes(":")) return true;
  if (BLOCKED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return true;

  const ipv4 = parseIpv4(hostname);
  if (ipv4) return isNonPublicIpv4(ipv4);

  // Public B2B targets are qualified domains. Reject single-label names that
  // could resolve only through an internal search domain.
  return !hostname.includes(".");
}

export function normalizePublicHttpUrl(raw, { httpsOnly = false } = {}) {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, error: "URL is required" };
  }

  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, error: "URL is invalid" };
  }

  if (
    (httpsOnly && url.protocol !== "https:") ||
    (!httpsOnly && url.protocol !== "https:" && url.protocol !== "http:")
  ) {
    return { ok: false, error: httpsOnly ? "URL must use HTTPS" : "URL must use HTTP or HTTPS" };
  }
  if (url.username || url.password) {
    return { ok: false, error: "URL credentials are not allowed" };
  }
  if (
    url.port &&
    !((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80"))
  ) {
    return { ok: false, error: "Non-standard URL ports are not allowed" };
  }
  if (isUnsafePublicHostname(url.hostname)) {
    return { ok: false, error: "URL must use a public internet hostname" };
  }

  url.hash = "";
  return { ok: true, url: url.toString() };
}
