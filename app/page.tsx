"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useSQLiteLoader } from "@/lib/useSQLiteLoader";
import {
  processData,
  formatDuration,
  getDataDateRange,
} from "@/lib/activityParser";
import type { AppGroup, TitleGroup } from "@/lib/activityParser";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────

const PALETTE = [
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#ef4444",
  "#84cc16",
  "#a855f7",
];

type Preset = "today" | "yesterday" | "last7d" | "all" | "custom";

interface TimeRange {
  start: Date;
  end: Date;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtShort(d: Date) {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Deterministic color per app name
function appColor(app: string) {
  let h = 0;
  for (const c of app) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return PALETTE[h % PALETTE.length];
}

// ─── URL Row ─────────────────────────────────────────────────────────────────

function UrlRow({
  url,
  duration,
  maxDuration,
  color,
}: {
  url: string;
  duration: number;
  maxDuration: number;
  color: string;
}) {
  const pct = maxDuration > 0 ? (duration / maxDuration) * 100 : 0;
  return (
    <div className="flex flex-col gap-1 py-1.5 pl-3">
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-xs text-muted-foreground truncate max-w-[72%]"
          title={url}
        >
          <span className="opacity-50 mr-1">↗</span>
          {url}
        </span>
        <span className="text-xs font-mono text-muted-foreground shrink-0">
          {formatDuration(duration)}
        </span>
      </div>
      <div className="h-0.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full opacity-60 transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Title Row ────────────────────────────────────────────────────────────────

function TitleRow({
  group,
  maxDuration,
  color,
}: {
  group: TitleGroup;
  maxDuration: number;
  color: string;
}) {
  const [open, setOpen] = useState(false);
  const hasUrls = group.urls.length > 0;
  const pct = maxDuration > 0 ? (group.totalDuration / maxDuration) * 100 : 0;

  return (
    <div className="rounded-md overflow-hidden">
      <button
        onClick={() => hasUrls && setOpen((o) => !o)}
        className={cn(
          "w-full flex flex-col gap-1.5 px-3 py-2 rounded-md text-left transition-colors",
          hasUrls ? "hover:bg-muted/60 cursor-pointer" : "cursor-default",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {hasUrls && (
              <span className="text-muted-foreground text-xs shrink-0 w-3">
                {open ? "▾" : "▸"}
              </span>
            )}
            {!hasUrls && <span className="w-3" />}
            <span
              className="text-sm text-foreground/80 truncate"
              title={group.title || "(no title)"}
            >
              {group.title || (
                <em className="text-muted-foreground not-italic">no title</em>
              )}
            </span>
          </div>
          <span className="text-xs font-mono text-muted-foreground shrink-0">
            {formatDuration(group.totalDuration)}
          </span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full opacity-50 transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </button>
      {open && hasUrls && (
        <div
          className="pl-4 border-l-2 ml-4 mt-0.5 space-y-0.5 pb-1"
          style={{ borderColor: `${color}40` }}
        >
          {group.urls.map((u) => (
            <UrlRow
              key={u.url}
              url={u.url}
              duration={u.totalDuration}
              maxDuration={group.totalDuration}
              color={color}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── App Card ────────────────────────────────────────────────────────────────

function AppCard({
  group,
  totalActive,
  rank,
}: {
  group: AppGroup;
  totalActive: number;
  rank: number;
}) {
  const [open, setOpen] = useState(false);
  const pct = totalActive > 0 ? (group.totalDuration / totalActive) * 100 : 0;
  const color = appColor(group.app);
  const initial = group.app.charAt(0).toUpperCase();

  return (
    <div
      className="rounded-xl border bg-card overflow-hidden transition-shadow hover:shadow-md"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      {/* App Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex flex-col gap-2 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ backgroundColor: color }}
          >
            {initial}
          </div>
          {/* App name + time */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-sm truncate">
                {group.app}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="text-sm font-mono font-semibold"
                  style={{ color }}
                >
                  {formatDuration(group.totalDuration)}
                </span>
                <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted">
                  {pct.toFixed(0)}%
                </span>
                <span className="text-muted-foreground text-xs">
                  {open ? "▴" : "▾"}
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </button>

      {/* Expanded titles */}
      {open && (
        <div className="border-t px-2 pb-2 pt-1 space-y-0.5 bg-muted/20">
          {group.titles.map((t) => (
            <TitleRow
              key={t.title}
              group={t}
              maxDuration={group.totalDuration}
              color={color}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Upload Zone ─────────────────────────────────────────────────────────────

function UploadZone({ onFile }: { onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "w-full max-w-md border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-5 cursor-pointer transition-all duration-200",
          dragging
            ? "border-violet-500 bg-violet-500/5 scale-105"
            : "border-border hover:border-violet-400 hover:bg-muted/30",
        )}
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-3xl shadow-lg">
          📊
        </div>
        <div className="text-center space-y-1">
          <p className="text-lg font-semibold">
            Drop ActivityWatch SQLite file
          </p>
          <p className="text-sm text-muted-foreground">
            Supports .db, .sqlite, .sqlite3
          </p>
        </div>
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Browse file
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".db,.sqlite,.sqlite3"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </div>
      <p className="mt-6 text-xs text-muted-foreground text-center max-w-sm">
        Fully processed in your browser — your data never leaves your device.
      </p>
    </div>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────────────

function StatsRow({
  totalActive,
  appCount,
  eventCount,
}: {
  totalActive: number;
  appCount: number;
  eventCount: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        {
          label: "Active Time",
          value: formatDuration(totalActive),
          sub: "net of AFK",
          color: "#8b5cf6",
        },
        {
          label: "Apps Used",
          value: appCount.toString(),
          sub: "unique apps",
          color: "#3b82f6",
        },
        {
          label: "Events",
          value:
            eventCount > 999
              ? `${(eventCount / 1000).toFixed(1)}k`
              : eventCount.toString(),
          sub: "window events",
          color: "#10b981",
        },
      ].map(({ label, value, sub, color }) => (
        <Card key={label} className="overflow-hidden">
          <div className="h-1 w-full" style={{ backgroundColor: color }} />
          <CardContent className="pt-3 pb-3 px-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold mt-0.5 font-mono">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Time Filter ─────────────────────────────────────────────────────────────

function TimeFilter({
  dataMax,
  value,
  onChange,
}: {
  dataMax: Date;
  value: TimeRange | undefined;
  onChange: (range: TimeRange | undefined, preset: Preset) => void;
}) {
  const [preset, setPreset] = useState<Preset>("today");
  const [customStart, setCustomStart] = useState(
    toDatetimeLocal(startOfDay(dataMax)),
  );
  const [customEnd, setCustomEnd] = useState(
    toDatetimeLocal(endOfDay(dataMax)),
  );

  const applyPreset = useCallback(
    (p: Preset, max: Date = dataMax) => {
      setPreset(p);
      if (p === "all") {
        onChange(undefined, p);
        return;
      }
      if (p === "custom") {
        const s = new Date(customStart);
        const e = new Date(customEnd);
        if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
          onChange({ start: s, end: e }, p);
        }
        return;
      }
      const todayStart = startOfDay(max);
      if (p === "today") {
        onChange({ start: todayStart, end: endOfDay(max) }, p);
      } else if (p === "yesterday") {
        const yStart = new Date(todayStart.getTime() - 86400000);
        const yEnd = new Date(todayStart.getTime() - 1);
        onChange({ start: yStart, end: yEnd }, p);
      } else if (p === "last7d") {
        const s = new Date(todayStart.getTime() - 6 * 86400000);
        onChange({ start: s, end: endOfDay(max) }, p);
      }
    },
    [dataMax, customStart, customEnd, onChange],
  );

  // Apply custom when inputs change
  const applyCustom = useCallback(() => {
    const s = new Date(customStart);
    const e = new Date(customEnd);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      onChange({ start: s, end: e }, "custom");
    }
  }, [customStart, customEnd, onChange]);

  const presets: { key: Preset; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "last7d", label: "Last 7d" },
    { key: "all", label: "All time" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {presets.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => applyPreset(key)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-all",
              preset === key
                ? "bg-primary text-primary-foreground shadow"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            type="datetime-local"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="flex-1 min-w-0 text-xs rounded-lg border border-border bg-background px-3 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-muted-foreground text-xs">→</span>
          <input
            type="datetime-local"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="flex-1 min-w-0 text-xs rounded-lg border border-border bg-background px-3 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={applyCustom}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
          >
            Apply
          </button>
        </div>
      )}
      {value && (
        <p className="text-xs text-muted-foreground">
          {fmtShort(value.start)} → {fmtShort(value.end)}
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const { loadState, loadFile } = useSQLiteLoader();
  const [timeRange, setTimeRange] = useState<TimeRange | undefined>(undefined);
  const [activePreset, setActivePreset] = useState<Preset>("today");
  const [initialized, setInitialized] = useState(false);

  // Derive the max timestamp from data to bootstrap defaults
  const dataMax = useMemo(() => {
    if (loadState.status !== "done") return null;
    const dr = getDataDateRange(loadState.windowEvents);
    return dr ? dr.end : null;
  }, [loadState]);

  // Set default time range once data loads
  useMemo(() => {
    if (dataMax && !initialized) {
      setTimeRange({
        start: startOfDay(dataMax),
        end: endOfDay(dataMax),
      });
      setInitialized(true);
    }
  }, [dataMax, initialized]);

  const report = useMemo(() => {
    if (loadState.status !== "done") return null;
    return processData(
      loadState.windowEvents,
      loadState.afkEvents,
      timeRange,
      loadState.webEvents,
    );
  }, [loadState, timeRange]);

  const handleTimeChange = useCallback(
    (range: TimeRange | undefined, preset: Preset) => {
      setTimeRange(range);
      setActivePreset(preset);
    },
    [],
  );

  const totalEvents =
    loadState.status === "done" ? loadState.windowEvents.length : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-sm">
              📊
            </div>
            <div>
              <h1 className="text-sm font-bold leading-none">
                Activity Report
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                ActivityWatch · SQLite
              </p>
            </div>
          </div>
          {loadState.status === "done" && (
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Load another file
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 pb-16 space-y-6 pt-5">
        {/* Idle */}
        {loadState.status === "idle" && <UploadZone onFile={loadFile} />}

        {/* Loading */}
        {loadState.status === "loading" && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-4 border-muted" />
              <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-medium">Parsing SQLite database…</p>
              <p className="text-sm text-muted-foreground mt-1">
                This may take a few seconds for large files.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {loadState.status === "error" && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center text-3xl">
              ⚠️
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-destructive">
                Failed to load file
              </p>
              <p className="text-sm text-muted-foreground max-w-sm">
                {loadState.message}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Try again
            </button>
          </div>
        )}

        {/* Report */}
        {loadState.status === "done" && report && dataMax && (
          <>
            {/* Time filter */}
            <div className="rounded-xl border bg-card px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Time Range
              </p>
              <TimeFilter
                dataMax={dataMax}
                value={timeRange}
                onChange={handleTimeChange}
              />
            </div>

            {/* Stats */}
            <StatsRow
              totalActive={report.totalActiveSeconds}
              appCount={report.appGroups.length}
              eventCount={totalEvents}
            />

            {/* App list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Apps
                </p>
                <p className="text-xs text-muted-foreground">
                  {report.appGroups.length} apps · tap to expand
                </p>
              </div>

              {report.appGroups.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-muted/20 py-16 flex flex-col items-center gap-3 text-center px-6">
                  <span className="text-4xl">🔍</span>
                  <div>
                    <p className="font-medium">No active events found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Try changing the time range — the data may be from a
                      different day.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {report.appGroups.map((g, i) => (
                    <AppCard
                      key={g.app}
                      group={g}
                      totalActive={report.totalActiveSeconds}
                      rank={i}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
