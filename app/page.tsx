"use client";

import { useCallback, useMemo, useState } from "react";
import { useSQLiteLoader } from "@/lib/useSQLiteLoader";
import { processData, getDataDateRange } from "@/lib/activityParser";
import type { ProcessingMode } from "@/lib/activityParser";
import { cn } from "@/lib/utils";

import { UploadZone } from "@/components/activity/UploadZone";
import { StatsRow } from "@/components/activity/StatsRow";
import { AppCard } from "@/components/activity/AppCard";
import { ListTab } from "@/components/activity/ListTab";
import {
  TimeFilter,
  startOfDay,
  endOfDay,
} from "@/components/activity/TimeFilter";
import type { TimeRange } from "@/components/activity/TimeFilter";

// ─── Page ────────────────────────────────────────────────────────────────────

type ViewTab = "list" | "apps";

export default function Home() {
  const { loadState, loadFile } = useSQLiteLoader();
  // null = user explicitly chose "All time" (no filter)
  // undefined = user hasn't picked, default to today
  const [userRange, setUserRange] = useState<TimeRange | null | undefined>(
    undefined,
  );
  const [mode, setMode] = useState<ProcessingMode>("custom");
  const [viewTab, setViewTab] = useState<ViewTab>("list");

  const dataMax = useMemo(() => {
    if (loadState.status !== "done") return null;
    const dr = getDataDateRange(loadState.windowEvents);
    return dr ? dr.end : null;
  }, [loadState]);

  const timeRange = useMemo<TimeRange | undefined>(() => {
    if (userRange === null) return undefined; // All time — no filter
    if (userRange) return userRange;
    if (!dataMax) return undefined;
    return { start: startOfDay(dataMax, mode), end: endOfDay(dataMax, mode) };
  }, [userRange, dataMax, mode]);

  const report = useMemo(() => {
    if (loadState.status !== "done") return null;
    return processData(
      loadState.windowEvents,
      loadState.afkEvents,
      timeRange,
      loadState.webEvents,
      mode,
    );
  }, [loadState, timeRange, mode]);

  const handleTimeChange = useCallback(
    (range: TimeRange | undefined, preset: string) => {
      if (preset === "all") setUserRange(null);
      else setUserRange(range);
    },
    [],
  );

  const totalEvents =
    loadState.status === "done" ? loadState.windowEvents.length : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-sm">
        <div className="lg:max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-sm">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </div>
            <div className="leading-tight">
              <span className="text-sm font-semibold tracking-tight">
                Activity Report
              </span>
              <span className="text-muted-foreground text-xs ml-1.5">
                · ActivityWatch
              </span>
            </div>
          </div>
          {loadState.status === "done" && (
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Load another
            </button>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="lg:max-w-5xl mx-auto px-4 pb-16 pt-5 space-y-5">
        {/* Idle */}
        {loadState.status === "idle" && <UploadZone onFile={loadFile} />}

        {/* Loading */}
        {loadState.status === "loading" && (
          <div className="flex flex-col items-center justify-center min-h-[55vh] gap-5">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-[3px] border-muted" />
              <div className="absolute inset-0 rounded-full border-[3px] border-violet-500 border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Parsing database…</p>
              <p className="text-xs text-muted-foreground mt-1">
                May take a few seconds for large files.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {loadState.status === "error" && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-red-500 text-sm">
                Failed to load file
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {loadState.message}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Try again
            </button>
          </div>
        )}

        {/* Report */}
        {loadState.status === "done" && report && dataMax && (
          <>
            {/* ── Controls ── */}
            <div className="rounded-xl border bg-card divide-y">
              {/* Mode */}
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-foreground/80">
                    Processing mode
                  </p>
                  <ul className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                    {mode === "aw" ? (
                      <>
                        <li>· Day starts 04:00</li>
                        <li>· Fill gaps ≤5s (flood)</li>
                        <li>· Netflix/YouTube only when not AFK</li>
                      </>
                    ) : (
                      <>
                        <li>· Day starts 00:00</li>
                        <li>· Fill gaps ≤5s (flood)</li>
                        <li>· Netflix/YouTube always counted</li>
                      </>
                    )}
                  </ul>
                </div>
                <div className="flex rounded-lg overflow-hidden border text-xs font-medium shrink-0">
                  {(["aw", "custom"] as ProcessingMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMode(m);
                        setUserRange({
                          start: startOfDay(dataMax, m),
                          end: endOfDay(dataMax, m),
                        });
                      }}
                      className={cn(
                        "px-3 py-1.5 transition-colors",
                        m !== "aw" && "border-l",
                        mode === m
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {m === "aw" ? "Activity Watch" : "Custom"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time range */}
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-foreground/80 mb-2">
                  Time range
                </p>
                <TimeFilter
                  dataMax={dataMax}
                  value={timeRange}
                  onChange={handleTimeChange}
                  mode={mode}
                />
              </div>
            </div>

            {/* ── Stats ── */}
            <StatsRow
              totalActive={report.totalActiveSeconds}
              appCount={report.appGroups.length}
              eventCount={totalEvents}
            />

            {/* ── Tab switcher ── */}
            <div className="flex gap-1 rounded-xl border bg-muted/30 p-1">
              {(["list", "apps"] as ViewTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setViewTab(tab)}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-all",
                    viewTab === tab
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab === "list" ? "List View" : "Apps"}
                </button>
              ))}
            </div>

            {/* ── Content ── */}
            {viewTab === "list" ? (
              <ListTab
                report={report}
                totalActive={report.totalActiveSeconds}
              />
            ) : (
              <div className="space-y-2.5">
                {report.appGroups.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-muted/10 py-16 flex flex-col items-center gap-3 text-center px-6">
                    <span className="text-3xl">🔍</span>
                    <div>
                      <p className="font-semibold text-sm">
                        No active events found
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                        Try changing the time range — the data may be from a
                        different day.
                      </p>
                    </div>
                  </div>
                ) : (
                  report.appGroups.map((g) => (
                    <AppCard
                      key={g.app}
                      group={g}
                      totalActive={report.totalActiveSeconds}
                    />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
