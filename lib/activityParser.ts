export interface EventRow {
  id: number;
  bucket_id: number;
  timestamp: string;
  duration: number;
  datastr: string;
}

export interface BucketRow {
  key: number;
  id: string;
  created: string;
  name: string | null;
  type: string;
  client: string;
  hostname: string;
  datastr: string;
}

export interface ParsedEvent {
  id: number;
  bucket_id: number;
  timestamp: Date;
  duration: number;
  app?: string;
  title?: string;
  url?: string;
  status?: string;
}

export interface AppGroup {
  app: string;
  totalDuration: number;
  titles: TitleGroup[];
}

export interface TitleGroup {
  title: string;
  totalDuration: number;
  urls: UrlGroup[];
}

export interface UrlGroup {
  url: string;
  totalDuration: number;
}

export interface ReportData {
  totalActiveSeconds: number;
  appGroups: AppGroup[];
  dateRange: { start: Date; end: Date } | null;
  buckets: BucketRow[];
}

/**
 * SQLite stores timestamps as "2026-05-09 04:31:31.990000+00:00" (space, not T).
 * Replace the first space with T so Date() parses it as proper ISO 8601 UTC.
 */
function parseTimestamp(ts: string): Date {
  // Only replace the first space (between date and time part)
  return new Date(ts.replace(" ", "T"));
}

/** Returns the full date range of all window events in the raw data */
export function getDataDateRange(
  windowEvents: EventRow[],
): { start: Date; end: Date } | null {
  if (windowEvents.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const e of windowEvents) {
    const t = parseTimestamp(e.timestamp).getTime();
    if (t < min) min = t;
    if (t > max) max = t;
  }
  return { start: new Date(min), end: new Date(max) };
}

function parseDatastr(datastr: string): Record<string, string> {
  try {
    return JSON.parse(datastr);
  } catch {
    return {};
  }
}

function isNetflixOrYoutube(event: ParsedEvent): boolean {
  const fields = [event.app ?? "", event.title ?? "", event.url ?? ""];
  return fields.some((f) => /netflix|youtube/i.test(f));
}

/**
 * Fills gaps ≤ pulsetime seconds between consecutive events, matching AW's flood().
 * Adjacent events: if gap ≤ pulsetime, the longer event is extended to cover the gap.
 * Same-data adjacent events (same app/status) with negative gaps are merged.
 */
function floodEvents(events: ParsedEvent[], pulsetime = 5): ParsedEvent[] {
  if (events.length === 0) return events;
  const sorted = events
    .map((e) => ({ ...e, timestamp: new Date(e.timestamp) }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  for (let i = 0; i < sorted.length - 1; i++) {
    const e1 = sorted[i];
    const e2 = sorted[i + 1];
    const e1EndMs = e1.timestamp.getTime() + e1.duration * 1000;
    const gapMs = e2.timestamp.getTime() - e1EndMs;

    if (gapMs <= 0 || gapMs > pulsetime * 1000) continue;

    // Fill the gap: extend the longer event toward the shorter one
    if (e1.duration >= e2.duration) {
      // e1 is longer: extend e1 to start of e2
      e1.duration = (e2.timestamp.getTime() - e1.timestamp.getTime()) / 1000;
    } else {
      // e2 is longer: extend e2 backwards to end of e1
      const newDur =
        (e2.timestamp.getTime() + e2.duration * 1000 - e1EndMs) / 1000;
      e2.timestamp = new Date(e1EndMs);
      e2.duration = newDur;
    }
  }

  return sorted.filter((e) => e.duration > 0);
}

/**
 * Merge overlapping/adjacent intervals into a minimal set of non-overlapping
 * intervals. Input: array of [start_ms, end_ms]. Output: sorted merged array.
 */
function mergeIntervals(intervals: [number, number][]): [number, number][] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur[0] <= last[1]) {
      // overlaps — extend
      if (cur[1] > last[1]) last[1] = cur[1];
    } else {
      merged.push([cur[0], cur[1]]);
    }
  }
  return merged;
}

/** Total overlap (ms) between interval [s,e] and a sorted merged interval list. */
function overlapWithMerged(
  s: number,
  e: number,
  merged: [number, number][],
): number {
  let total = 0;
  for (const [ms, me] of merged) {
    if (ms >= e) break; // merged list is sorted, no more overlaps possible
    const oS = Math.max(s, ms);
    const oE = Math.min(e, me);
    if (oE > oS) total += oE - oS;
  }
  return total;
}

export type ProcessingMode = "aw" | "custom";

/**
 * mode "aw"     — matches ActivityWatch behaviour:
 *   - flood() fills ≤5s gaps between events
 *   - YouTube/Netflix NOT exempt (treated same as other apps, must intersect not-afk)
 *
 * mode "custom" — our extended behaviour:
 *   - no flood()
 *   - YouTube/Netflix exempt from AFK filter (always included with full duration)
 */
export function processData(
  windowEvents: EventRow[],
  afkEvents: EventRow[],
  timeRange?: { start: Date; end: Date },
  webEvents?: EventRow[],
  mode: ProcessingMode = "custom",
): ReportData {
  // Parse window events — note: url here is from window watcher (less reliable)
  const parsedWindow: ParsedEvent[] = windowEvents.map((e) => {
    const data = parseDatastr(e.datastr);
    return {
      id: e.id,
      bucket_id: e.bucket_id,
      timestamp: parseTimestamp(e.timestamp),
      duration: e.duration,
      app: data.app,
      title: data.title,
      url: data.url,
    };
  });

  // Parse afk events
  const parsedAfkAll: ParsedEvent[] = afkEvents.map((e) => {
    const data = parseDatastr(e.datastr);
    return {
      id: e.id,
      bucket_id: e.bucket_id,
      timestamp: parseTimestamp(e.timestamp),
      duration: e.duration,
      status: data.status,
    };
  });

  // Parse web watcher events (chrome extension — more accurate URLs)
  const parsedWeb = (webEvents ?? []).map((e) => {
    const data = parseDatastr(e.datastr);
    return {
      ts: parseTimestamp(e.timestamp).getTime(),
      dur: e.duration,
      url: data.url ?? "",
    };
  });

  // Apply time range filter
  const rangeStart = timeRange?.start.getTime();
  const rangeEnd = timeRange?.end.getTime();

  const inRange = (ts: number, dur: number) => {
    if (!rangeStart || !rangeEnd) return true;
    const evEnd = ts + dur * 1000;
    return ts < rangeEnd && evEnd > rangeStart;
  };

  // Both modes: flood() fills ≤5s gaps between events.
  // Switching tabs/apps within 5s = still active, not a break.
  const windowToFilter = floodEvents(parsedWindow);
  const afkToFilter = floodEvents(parsedAfkAll);

  const filteredWindow = windowToFilter.filter((e) =>
    inRange(e.timestamp.getTime(), e.duration),
  );
  const parsedAfk = afkToFilter.filter((e) =>
    inRange(e.timestamp.getTime(), e.duration),
  );

  // Build merged not-afk intervals once (avoid O(n*m) double-counting)
  const notAfkIntervals: [number, number][] = parsedAfk
    .filter((a) => a.status === "not-afk")
    .map((a) => [
      a.timestamp.getTime(),
      a.timestamp.getTime() + a.duration * 1000,
    ]);
  const mergedNotAfk = mergeIntervals(notAfkIntervals);

  // Keep window events that pass the AFK filter.
  // custom mode: Netflix/YouTube always pass through regardless of AFK status.
  // aw mode: Netflix/YouTube treated same as other apps (must intersect not-afk).
  const activeWindowEvents: ParsedEvent[] = [];

  for (const wEv of filteredWindow) {
    const wStart = wEv.timestamp.getTime();
    const wEnd = wStart + wEv.duration * 1000;

    if (mode === "custom" && isNetflixOrYoutube(wEv)) {
      // Custom rule: Netflix/YouTube pass through regardless of afk status
      activeWindowEvents.push(wEv);
    } else if (overlapWithMerged(wStart, wEnd, mergedNotAfk) > 0) {
      // Must intersect with a not-afk interval
      activeWindowEvents.push(wEv);
    }
  }

  // Compute clipped duration per event using merged intervals (no double-counting)
  // Also: enrich URL from chrome web watcher (most accurate source)
  const clippedEvents = activeWindowEvents.map((wEv) => {
    const wStart = wEv.timestamp.getTime();
    const wEnd = wStart + wEv.duration * 1000;

    let clippedMs: number;
    if (mode === "custom" && isNetflixOrYoutube(wEv)) {
      // Custom mode: Netflix/YouTube use full duration clipped to time range only
      const clampedStart = rangeStart ? Math.max(wStart, rangeStart) : wStart;
      const clampedEnd = rangeEnd ? Math.min(wEnd, rangeEnd) : wEnd;
      clippedMs = Math.max(0, clampedEnd - clampedStart);
    } else {
      // AW mode (all events) or custom mode (non-Netflix/YouTube): clip to not-afk
      clippedMs = overlapWithMerged(wStart, wEnd, mergedNotAfk);
    }

    // Find best-matching web event URL by maximum overlap
    let enrichedUrl = wEv.url ?? "";
    if (parsedWeb.length > 0) {
      const wStart = wEv.timestamp.getTime();
      const wEnd = wStart + wEv.duration * 1000;
      let bestOverlap = 0;
      for (const wb of parsedWeb) {
        const wbEnd = wb.ts + wb.dur * 1000;
        const oStart = Math.max(wStart, wb.ts);
        const oEnd = Math.min(wEnd, wbEnd);
        if (oEnd > oStart && oEnd - oStart > bestOverlap && wb.url) {
          bestOverlap = oEnd - oStart;
          enrichedUrl = wb.url;
        }
      }
    }

    return {
      ...wEv,
      url: enrichedUrl,
      clippedDuration: clippedMs / 1000,
    };
  });

  // Group by app -> title -> url
  const appMap = new Map<string, Map<string, Map<string, number>>>();

  let totalActiveSeconds = 0;

  for (const ev of clippedEvents) {
    if (ev.clippedDuration <= 0) continue;
    const app = ev.app || "(unknown app)";
    const title = ev.title || "";
    const url = ev.url || "";

    if (!appMap.has(app)) appMap.set(app, new Map());
    const titleMap = appMap.get(app)!;

    if (!titleMap.has(title)) titleMap.set(title, new Map());
    const urlMap = titleMap.get(title)!;

    urlMap.set(url, (urlMap.get(url) ?? 0) + ev.clippedDuration);
    totalActiveSeconds += ev.clippedDuration;
  }

  // Convert to sorted arrays
  const appGroups: AppGroup[] = Array.from(appMap.entries())
    .map(([app, titleMap]) => {
      const titles: TitleGroup[] = Array.from(titleMap.entries())
        .map(([title, urlMap]) => {
          const urls: UrlGroup[] = Array.from(urlMap.entries())
            .map(([url, dur]) => ({ url, totalDuration: dur }))
            .filter((u) => u.url !== "")
            .sort((a, b) => b.totalDuration - a.totalDuration);
          const totalDuration = Array.from(urlMap.values()).reduce(
            (a, b) => a + b,
            0,
          );
          return { title, totalDuration, urls };
        })
        .sort((a, b) => b.totalDuration - a.totalDuration);
      const totalDuration = titles.reduce((a, b) => a + b.totalDuration, 0);
      return { app, totalDuration, titles };
    })
    .sort((a, b) => b.totalDuration - a.totalDuration);

  // Date range from filtered window events (already parsed as UTC-correct local Date)
  let dateRange: { start: Date; end: Date } | null = null;
  if (filteredWindow.length > 0) {
    const timestamps = filteredWindow.map((e) => e.timestamp.getTime());
    dateRange = {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps)),
    };
  }

  return {
    totalActiveSeconds,
    appGroups,
    dateRange,
    buckets: [],
  };
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
