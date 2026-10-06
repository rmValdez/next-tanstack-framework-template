// Any origin works as the base: it only exists so relative input can be parsed, and a
// result on a different origin means the input escaped to another host.
const BASE = "http://redirect.invalid";

/**
 * Returns `input` when it is a same-origin path, otherwise `fallback`. Guards
 * `redirectTo`-style query parameters against open redirects, including the
 * protocol-relative (`//evil.com`) and backslash (`/\evil.com`) forms browsers accept.
 */
export function safeRedirectPath(input: string | null | undefined, fallback = "/"): string {
  if (!input || !input.startsWith("/") || input.startsWith("//") || input.startsWith("/\\")) {
    return fallback;
  }

  try {
    const url = new URL(input, BASE);
    if (url.origin !== BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
