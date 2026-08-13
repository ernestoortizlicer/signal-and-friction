export type TargetUrlResult =
  | { ok: true; url: string }
  | { ok: false; reason: 'invalid_url' | 'unsupported_scheme' | 'credentials_forbidden' | 'non_public_host' | 'nonstandard_port' };

function looksLikeIpLiteral(hostname: string): boolean {
  // Workers public fetch does not need literal IP targets for this product.
  // Reject all IPv4/IPv6 literals rather than trying to maintain an
  // incomplete private/reserved-address allow/deny table.
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return true;
  return hostname.includes(':');
}

export function canonicalizePublicTargetUrl(raw: string): TargetUrlResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: 'invalid_url' };

  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: 'unsupported_scheme' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'credentials_forbidden' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    !hostname ||
    looksLikeIpLiteral(hostname) ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return { ok: false, reason: 'non_public_host' };
  }

  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    return { ok: false, reason: 'nonstandard_port' };
  }

  parsed.hash = '';
  return { ok: true, url: parsed.toString() };
}
