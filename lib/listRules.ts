// ─── Shared List-Tab logic ────────────────────────────────────────────────────

export interface UserRule {
  id: string;
  app: string; // exact app name
  titleRegex: string; // regex pattern applied to title
  groupName: string; // group label when matched
}

/** Apps that use built-in last-segment grouping (filename — project). */
export const BUILTIN_LAST_SEGMENT = new Set(["Code", "Postman"]);

/** Apps that use built-in browser host grouping via the AW title pattern. */
export const BUILTIN_BROWSER_APPS = new Set([
  "Google Chrome",
  "Brave Browser",
  "Microsoft Edge",
]);

/** Regex that matches the AW browser token: _|⌈h=… p=…⌉|_ (with optional leading whitespace). */
const BROWSER_TOKEN_RE = /\s*_\|\u2308[^\u2309]*\u2309\|_/;

/**
 * Strips the AW browser token _|⌈h=… p=…⌉|_ from a title.
 * Useful for normalising titles before comparing / merging.
 */
export function stripBrowserPattern(title: string): string {
  return title.replace(BROWSER_TOKEN_RE, "");
}

/**
 * Extracts the browser host from the AW browser title pattern:
 *   "Meet - Foo _|⌈h=meet.google.com p=/abc⌉|_ - Microphone - Chrome"
 * Returns { host, strippedTitle } where strippedTitle is the full title
 * with just the token removed.  Returns null if the pattern is absent.
 */
export function extractBrowserInfo(
  title: string,
): { host: string; strippedTitle: string } | null {
  // ⌈ = U+2308, ⌉ = U+2309
  const m = title.match(/\s*_\|\u2308h=([^\s\u2309]+)[^\u2309]*\u2309\|_/);
  if (!m) return null;
  return { host: m[1], strippedTitle: stripBrowserPattern(title) };
}

/**
 * Extracts the last segment of a title split by em dash " — " or hyphen " - ".
 * Returns { group: "project name", item: "file or route name" } or null.
 */
export function extractLastSegment(
  title: string,
): { group: string; item: string } | null {
  const emIdx = title.lastIndexOf(" \u2014 ");
  const hyphenIdx = title.lastIndexOf(" - ");
  const idx = Math.max(emIdx, hyphenIdx);
  if (idx < 0) return null;
  return {
    group: title.slice(idx + 3).trim(),
    item: title.slice(0, idx).trim(),
  };
}

/**
 * Resolves grouping for a (app, title) pair given user rules.
 * Returns { group, item } or null (flat / no grouping).
 */
export function resolveGroup(
  app: string,
  title: string,
  userRules: UserRule[],
): { group: string; item: string } | null {
  // 1. User rules (in order) — first match wins
  const appRules = userRules.filter(
    (r) => r.app === app && r.titleRegex.trim(),
  );
  if (appRules.length > 0) {
    for (const rule of appRules) {
      try {
        if (new RegExp(rule.titleRegex, "i").test(title)) {
          return { group: rule.groupName || "(matched)", item: title };
        }
      } catch {
        /* invalid regex — skip */
      }
    }
    return { group: "(other)", item: title };
  }

  // 2. Built-in last-segment for Code / Postman
  if (BUILTIN_LAST_SEGMENT.has(app)) {
    const seg = extractLastSegment(title);
    if (seg) return seg;
    return { group: "(other)", item: title };
  }

  // 3. Built-in browser host grouping for Chrome / Brave / Edge
  if (BUILTIN_BROWSER_APPS.has(app)) {
    const info = extractBrowserInfo(title);
    if (info) return { group: info.host, item: info.strippedTitle };
    return { group: "(other)", item: title };
  }

  // 4. No rule → flat
  return null;
}
