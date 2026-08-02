/**
 * SSRF guard: only allow http(s) URLs pointing at public hosts.
 * Blocks loopback, link-local (incl. cloud metadata), private and reserved ranges.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "instance-data",
]);

function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b, c, d] = m.slice(1).map(Number);
  if ([a, b, c, d].some((n) => n > 255)) return true; // malformed → reject
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local / 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved / broadcast
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "::1" || h === "::" ) return true;
  if (h.startsWith("fe80") || h.startsWith("fc") || h.startsWith("fd")) return true;
  // IPv4-mapped, e.g. ::ffff:127.0.0.1
  const mapped = h.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return false;
}

/**
 * Returns the normalized URL string, or throws when the target is not a
 * public http(s) endpoint.
 */
export function assertPublicHttpUrl(input: string): string {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }
  if (parsed.username || parsed.password) {
    throw new Error("URLs with embedded credentials are not allowed");
  }

  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) throw new Error("Invalid URL host");
  if (BLOCKED_HOSTNAMES.has(host)) throw new Error("This address is not allowed");
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) {
    throw new Error("This address is not allowed");
  }
  if (!host.includes(".") && !host.includes(":")) {
    throw new Error("This address is not allowed"); // bare internal hostnames
  }
  if (isPrivateIpv4(host) || isPrivateIpv6(host)) {
    throw new Error("This address is not allowed");
  }

  return parsed.toString();
}

/** Zod-friendly refinement helper. */
export function isPublicHttpUrl(input: string): boolean {
  try {
    assertPublicHttpUrl(input);
    return true;
  } catch {
    return false;
  }
}
