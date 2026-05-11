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

export function processData(
  windowEvents: EventRow[],
  afkEvents: EventRow[],
): ReportData {
  // Parse window events
  const parsedWindow: ParsedEvent[] = windowEvents.map((e) => {
    const data = parseDatastr(e.datastr);
    return {
      id: e.id,
      bucket_id: e.bucket_id,
      timestamp: new Date(e.timestamp),
      duration: e.duration,
      app: data.app,
      title: data.title,
      url: data.url,
    };
  });

  // Parse afk events
  const parsedAfk: ParsedEvent[] = afkEvents.map((e) => {
    const data = parseDatastr(e.datastr);
    return {
      id: e.id,
      bucket_id: e.bucket_id,
      timestamp: new Date(e.timestamp),
      duration: e.duration,
      status: data.status,
    };
  });

  // Only keep window events that intersect with a not-afk interval
  // OR are netflix/youtube (regardless of afk status)
  const activeWindowEvents: ParsedEvent[] = [];

  for (const wEv of parsedWindow) {
    const wStart = wEv.timestamp.getTime();
    const wEnd = wStart + wEv.duration * 1000;

    if (isNetflixOrYoutube(wEv)) {
      // Accept if intersects with ANY afk event (afk or not-afk)
      const intersects = parsedAfk.some((aEv) => {
        const aStart = aEv.timestamp.getTime();
        const aEnd = aStart + aEv.duration * 1000;
        return wStart < aEnd && wEnd > aStart;
      });
      if (intersects) activeWindowEvents.push(wEv);
    } else {
      // Accept only if intersects with a not-afk interval
      const intersects = parsedAfk.some((aEv) => {
        if (aEv.status !== "not-afk") return false;
        const aStart = aEv.timestamp.getTime();
        const aEnd = aStart + aEv.duration * 1000;
        return wStart < aEnd && wEnd > aStart;
      });
      if (intersects) activeWindowEvents.push(wEv);
    }
  }

  // Compute clipped duration per event to not exceed active afk window
  const clippedEvents = activeWindowEvents.map((wEv) => {
    const wStart = wEv.timestamp.getTime();
    const wEnd = wStart + wEv.duration * 1000;

    let clippedMs = 0;

    const relevantAfk = parsedAfk.filter((aEv) => {
      if (isNetflixOrYoutube(wEv)) {
        return true; // any afk status
      }
      return aEv.status === "not-afk";
    });

    for (const aEv of relevantAfk) {
      const aStart = aEv.timestamp.getTime();
      const aEnd = aStart + aEv.duration * 1000;
      const overlapStart = Math.max(wStart, aStart);
      const overlapEnd = Math.min(wEnd, aEnd);
      if (overlapEnd > overlapStart) {
        clippedMs += overlapEnd - overlapStart;
      }
    }

    return {
      ...wEv,
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

  // Date range from window events
  let dateRange: { start: Date; end: Date } | null = null;
  if (parsedWindow.length > 0) {
    const timestamps = parsedWindow.map((e) => e.timestamp.getTime());
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
