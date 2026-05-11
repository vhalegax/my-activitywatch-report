"use client";

import { useCallback, useRef, useState } from "react";
import { useSQLiteLoader } from "@/lib/useSQLiteLoader";
import { processData, formatDuration } from "@/lib/activityParser";
import type { AppGroup, TitleGroup } from "@/lib/activityParser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// ─── URL Row ────────────────────────────────────────────────────────────────

function UrlRow({ url, duration, maxDuration }: { url: string; duration: number; maxDuration: number }) {
  return (
    <div className="pl-4 py-1.5 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate max-w-[75%]" title={url}>
          🔗 {url || "(no url)"}
        </span>
        <span className="shrink-0 font-mono">{formatDuration(duration)}</span>
      </div>
      <Progress value={(duration / maxDuration) * 100} className="h-1" />
    </div>
  );
}

// ─── Title Row ───────────────────────────────────────────────────────────────

function TitleRow({ group, maxDuration }: { group: TitleGroup; maxDuration: number }) {
  const [open, setOpen] = useState(false);
  const hasUrls = group.urls.length > 0;

  return (
    <div className="border-l-2 border-muted ml-2 pl-2">
      <button
        onClick={() => hasUrls && setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 py-2 text-sm text-left ${hasUrls ? "cursor-pointer hover:bg-muted/40 rounded px-1 transition-colors" : "cursor-default px-1"}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {hasUrls && (
            <span className="text-muted-foreground text-xs shrink-0">
              {open ? "▾" : "▸"}
            </span>
          )}
          <span className="truncate text-sm" title={group.title}>
            {group.title || <em className="text-muted-foreground">no title</em>}
          </span>
        </div>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          {formatDuration(group.totalDuration)}
        </span>
      </button>
      <Progress value={(group.totalDuration / maxDuration) * 100} className="h-0.5 ml-1 mb-1" />
      {open && hasUrls && (
        <div className="mt-1 space-y-0.5">
          {group.urls.map((u) => (
            <UrlRow
              key={u.url}
              url={u.url}
              duration={u.totalDuration}
              maxDuration={group.totalDuration}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── App Card ────────────────────────────────────────────────────────────────

function AppCard({ group, totalActive }: { group: AppGroup; totalActive: number }) {
  const [open, setOpen] = useState(false);
  const pct = totalActive > 0 ? (group.totalDuration / totalActive) * 100 : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-3 text-left"
        >
          <span className="text-base font-semibold flex-1 truncate">{group.app}</span>
          <Badge variant="secondary" className="shrink-0 font-mono text-xs">
            {formatDuration(group.totalDuration)}
          </Badge>
          <span className="text-muted-foreground text-sm shrink-0">{open ? "▾" : "▸"}</span>
        </button>
        <Progress value={pct} className="h-1.5 mt-2" />
        <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(1)}% of active time</p>
      </CardHeader>
      {open && (
        <CardContent className="px-4 pb-4 pt-0 space-y-1">
          {group.titles.map((t) => (
            <TitleRow
              key={t.title}
              group={t}
              maxDuration={group.totalDuration}
            />
          ))}
        </CardContent>
      )}
    </Card>
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
    [onFile]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors
        ${dragging ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/40 hover:bg-muted/30"}`}
    >
      <div className="text-5xl">📂</div>
      <div className="text-center">
        <p className="font-semibold text-lg">Drop your ActivityWatch SQLite file here</p>
        <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
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
  );
}

// ─── Summary Stats ────────────────────────────────────────────────────────────

function SummaryStats({
  totalActive,
  appCount,
  dateRange,
}: {
  totalActive: number;
  appCount: number;
  dateRange: { start: Date; end: Date } | null;
}) {
  const fmt = (d: Date) =>
    d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Time</p>
          <p className="text-2xl font-bold mt-1">{formatDuration(totalActive)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Apps Used</p>
          <p className="text-2xl font-bold mt-1">{appCount}</p>
        </CardContent>
      </Card>
      {dateRange && (
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Period</p>
            <p className="text-sm font-medium mt-1">
              {fmt(dateRange.start)}
            </p>
            <p className="text-xs text-muted-foreground">to {fmt(dateRange.end)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const { loadState, loadFile } = useSQLiteLoader();

  const report =
    loadState.status === "done"
      ? processData(loadState.windowEvents, loadState.afkEvents)
      : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Activity Report</h1>
            <p className="text-xs text-muted-foreground">ActivityWatch · SQLite Viewer</p>
          </div>
          {report && (
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Load another file
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Idle */}
        {loadState.status === "idle" && (
          <UploadZone onFile={loadFile} />
        )}

        {/* Loading */}
        {loadState.status === "loading" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Parsing SQLite database…</p>
          </div>
        )}

        {/* Error */}
        {loadState.status === "error" && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Failed to load file</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{loadState.message}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm underline hover:text-foreground"
              >
                Try again
              </button>
            </CardContent>
          </Card>
        )}

        {/* Report */}
        {report && (
          <>
            <SummaryStats
              totalActive={report.totalActiveSeconds}
              appCount={report.appGroups.length}
              dateRange={report.dateRange}
            />

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Apps · click to expand
              </h2>
              <div className="space-y-3">
                {report.appGroups.map((g) => (
                  <AppCard key={g.app} group={g} totalActive={report.totalActiveSeconds} />
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
