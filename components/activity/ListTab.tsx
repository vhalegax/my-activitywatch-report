"use client";

import React, { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDuration } from "@/lib/activityParser";
import type { ReportData } from "@/lib/activityParser";
import {
  resolveGroup,
  stripBrowserPattern,
  BUILTIN_BROWSER_APPS,
} from "@/lib/listRules";
import type { UserRule } from "@/lib/listRules";
import { RulesEditor } from "./RulesEditor";
import { PatternInfoPanel } from "./PatternInfoPanel";
import { cn } from "@/lib/utils";

// ─── Browser title normalisation ─────────────────────────────────────────────
/**
 * For browser apps, strips the AW pattern token from every title and merges
 * entries whose stripped titles are identical (summing their durations).
 * The canonical title kept is whichever had the pattern (so host info is
 * preserved for resolveGroup).
 */
function normalizeBrowserTitles(
  titles: { title: string; totalDuration: number }[],
): { title: string; totalDuration: number }[] {
  const map = new Map<
    string,
    { canonicalTitle: string; totalDuration: number }
  >();
  for (const t of titles) {
    const key = stripBrowserPattern(t.title);
    const existing = map.get(key);
    if (existing) {
      existing.totalDuration += t.totalDuration;
      // Prefer the title that HAS the pattern so resolveGroup can extract the host
      if (!existing.canonicalTitle.includes("\u2308")) {
        existing.canonicalTitle = t.title;
      }
    } else {
      map.set(key, { canonicalTitle: t.title, totalDuration: t.totalDuration });
    }
  }
  return Array.from(map.values()).map(({ canonicalTitle, totalDuration }) => ({
    title: canonicalTitle,
    totalDuration,
  }));
}

// ─── Deterministic color per app ──────────────────────────────────────────────

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

function appColor(app: string) {
  let h = 0;
  for (const c of app) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return PALETTE[h % PALETTE.length];
}

// ─── Pct Chip ─────────────────────────────────────────────────────────────────

function PctChip({ num, den }: { num: number; den: number }) {
  if (den <= 0) return null;
  const pct = Math.round((num / den) * 100);
  if (pct <= 0) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-[1px] rounded-full bg-muted text-xs font-medium tabular-nums text-muted-foreground ml-1.5">
      {pct}%
    </span>
  );
}

// ─── ListTab ─────────────────────────────────────────────────────────────────

export function ListTab({
  report,
  totalActive,
}: {
  report: ReportData;
  totalActive: number;
}) {
  const [copied, setCopied] = useState(false);
  const [copiedDisplay, setCopiedDisplay] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showRules, setShowRules] = useState(false);
  const [showPatternInfo, setShowPatternInfo] = useState(false);
  const [userRules, setUserRules] = useState<UserRule[]>(() => {
    try {
      const saved = localStorage.getItem("aw-report-rules");
      return saved ? (JSON.parse(saved) as UserRule[]) : [];
    } catch {
      return [];
    }
  });

  const setUserRulesAndPersist = (rules: UserRule[]) => {
    setUserRules(rules);
    try {
      localStorage.setItem("aw-report-rules", JSON.stringify(rules));
    } catch {}
  };
  const [showRawTitles, setShowRawTitles] = useState(false);

  const appNames = useMemo(() => report.appGroups.map((g) => g.app), [report]);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const sortedApps = useMemo(
    () =>
      [...report.appGroups].sort((a, b) => b.totalDuration - a.totalDuration),
    [report],
  );

  const csvText = report.appGroups
    .flatMap((g) =>
      g.titles.map(
        (t) =>
          `${JSON.stringify(g.app)},${JSON.stringify(t.title)},${Math.round(t.totalDuration)}`,
      ),
    )
    .join("\n");

  const displayText = useMemo(() => {
    const lines: string[] = [];
    for (const g of sortedApps) {
      const pctApp =
        totalActive > 0 ? Math.round((g.totalDuration / totalActive) * 100) : 0;
      lines.push(`${g.app}\t${formatDuration(g.totalDuration)}\t${pctApp}%`);
      const gMap = new Map<
        string,
        { item: string; rawTitle: string; duration: number }[]
      >();
      const titlesForDisplay = BUILTIN_BROWSER_APPS.has(g.app)
        ? normalizeBrowserTitles(g.titles)
        : g.titles;
      for (const t of titlesForDisplay) {
        const r = resolveGroup(g.app, t.title, userRules);
        const k = r?.group ?? "\x00flat";
        const list = gMap.get(k) ?? [];
        list.push({
          item: r?.item ?? t.title,
          rawTitle: t.title,
          duration: t.totalDuration,
        });
        gMap.set(k, list);
      }
      const gTotals = new Map<string, number>();
      for (const [k, v] of gMap)
        gTotals.set(
          k,
          v.reduce((s, i) => s + i.duration, 0),
        );
      const groups = Array.from(gMap.keys())
        .filter((k) => k !== "\x00flat")
        .sort((a, b) => (gTotals.get(b) ?? 0) - (gTotals.get(a) ?? 0));
      const flat = (gMap.get("\x00flat") ?? []).sort(
        (a, b) => b.duration - a.duration,
      );
      for (const grp of groups) {
        const items = (gMap.get(grp) ?? []).sort(
          (a, b) => b.duration - a.duration,
        );
        const tot = gTotals.get(grp) ?? 0;
        const pGrp =
          g.totalDuration > 0 ? Math.round((tot / g.totalDuration) * 100) : 0;
        lines.push(`  ${grp}\t${formatDuration(tot)}\t${pGrp}%`);
        for (const item of items) {
          const p =
            g.totalDuration > 0
              ? Math.round((item.duration / g.totalDuration) * 100)
              : 0;
          lines.push(
            `    ${showRawTitles ? item.rawTitle : item.item}\t${formatDuration(item.duration)}\t${p}%`,
          );
        }
      }
      for (const item of flat) {
        const p =
          g.totalDuration > 0
            ? Math.round((item.duration / g.totalDuration) * 100)
            : 0;
        lines.push(
          `  ${showRawTitles ? item.rawTitle : item.item}\t${formatDuration(item.duration)}\t${p}%`,
        );
      }
    }
    return lines.join("\n");
  }, [sortedApps, userRules, totalActive, showRawTitles]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            title="Edit custom grouping rules"
            onClick={() => setShowRules((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors",
              showRules
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span className="text-sm">⚙</span>
            Rules
            {userRules.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {userRules.length}
              </span>
            )}
          </button>
          <button
            title="Show grouping pattern reference"
            onClick={() => setShowPatternInfo((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors",
              showPatternInfo
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            ?
          </button>
          <button
            title="Toggle between formatted (extracted) and raw (original) item titles"
            onClick={() => setShowRawTitles((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors",
              showRawTitles
                ? "bg-amber-500/10 text-amber-700 border-amber-400/40 dark:text-amber-400"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {showRawTitles ? "Raw titles" : "Formatted"}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            title="Copy displayed data as structured text (App → Group → Item with %, matches UI)"
            onClick={() =>
              navigator.clipboard.writeText(displayText).then(() => {
                setCopiedDisplay(true);
                setTimeout(() => setCopiedDisplay(false), 2000);
              })
            }
            className={cn(
              "inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border font-medium transition-all",
              copiedDisplay
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-400/40"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {copiedDisplay ? (
              <>
                <span>✓</span> Copied
              </>
            ) : (
              <>
                <span>⊞</span> Copy View
              </>
            )}
          </button>
          <button
            title="Copy raw data as CSV (app, title, duration seconds)"
            onClick={() =>
              navigator.clipboard.writeText(csvText).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              })
            }
            className={cn(
              "inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border font-medium transition-all",
              copied
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-400/40"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {copied ? (
              <>
                <span>✓</span> Copied
              </>
            ) : (
              <>
                <span>⎘</span> Copy CSV
              </>
            )}
          </button>
        </div>
      </div>

      {/* Rules editor */}
      {showRules && (
        <div className="rounded-xl border bg-card px-4 py-4">
          <RulesEditor
            rules={userRules}
            appNames={appNames}
            onChange={setUserRulesAndPersist}
          />
        </div>
      )}

      {/* Pattern info */}
      {showPatternInfo && <PatternInfoPanel />}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead className="w-full text-sm font-semibold text-foreground/70 h-9">
                App / Group / Title
              </TableHead>
              <TableHead className="w-32 text-right text-sm font-semibold text-foreground/70 h-9 pr-4">
                Duration
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedApps.map((g) => {
              const appKey = g.app;
              const isAppOpen = expanded.has(appKey);
              const color = appColor(g.app);

              // Build grouped structure
              const groupMap = new Map<
                string,
                { item: string; rawTitle: string; duration: number }[]
              >();
              const titlesToGroup = BUILTIN_BROWSER_APPS.has(g.app)
                ? normalizeBrowserTitles(g.titles)
                : g.titles;
              for (const t of titlesToGroup) {
                const resolved = resolveGroup(g.app, t.title, userRules);
                const groupKey = resolved?.group ?? "\x00flat";
                const itemLabel = resolved?.item ?? t.title;
                const list = groupMap.get(groupKey) ?? [];
                list.push({
                  item: itemLabel,
                  rawTitle: t.title,
                  duration: t.totalDuration,
                });
                groupMap.set(groupKey, list);
              }

              const groupTotals = new Map<string, number>();
              for (const [grp, items] of groupMap)
                groupTotals.set(
                  grp,
                  items.reduce((s, i) => s + i.duration, 0),
                );

              const sortedGroups = Array.from(groupMap.keys())
                .filter((k) => k !== "\x00flat")
                .sort(
                  (a, b) =>
                    (groupTotals.get(b) ?? 0) - (groupTotals.get(a) ?? 0),
                );

              const flatItems = (groupMap.get("\x00flat") ?? []).sort(
                (a, b) => b.duration - a.duration,
              );

              return (
                <React.Fragment key={g.app}>
                  {/* ── App row ── */}
                  <TableRow
                    className="cursor-pointer hover:bg-muted/30 border-t first:border-t-0"
                    style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                    onClick={() => toggle(appKey)}
                  >
                    <TableCell className="py-2.5 pl-3">
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-3 shrink-0">
                          {isAppOpen ? "▾" : "▸"}
                        </span>
                        <span
                          className="text-base font-semibold tracking-tight break-words min-w-0"
                          style={{ color }}
                        >
                          {g.app}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell
                      className="text-right py-2.5 tabular-nums font-mono text-base font-semibold pr-4"
                      style={{ color }}
                    >
                      <span>{formatDuration(g.totalDuration)}</span>
                      <PctChip num={g.totalDuration} den={totalActive} />
                    </TableCell>
                  </TableRow>

                  {isAppOpen && (
                    <>
                      {sortedGroups.map((grp) => {
                        const projKey = `${appKey}::${grp}`;
                        const isProjOpen = expanded.has(projKey);
                        const items = (groupMap.get(grp) ?? []).sort(
                          (a, b) => b.duration - a.duration,
                        );
                        const projTotal = groupTotals.get(grp)!;
                        const isOther = grp === "(other)";

                        return (
                          <React.Fragment key={grp}>
                            {/* Group row */}
                            <TableRow
                              className="cursor-pointer hover:bg-muted/20 bg-muted/5"
                              onClick={() => toggle(projKey)}
                            >
                              <TableCell className="py-2 pl-8 break-words">
                                <span className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground w-3 shrink-0">
                                    {isProjOpen ? "▾" : "▸"}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-sm font-medium break-all min-w-0",
                                      isOther
                                        ? "text-muted-foreground italic"
                                        : "text-foreground/75",
                                    )}
                                  >
                                    {grp}
                                  </span>
                                </span>
                              </TableCell>
                              <TableCell className="text-right py-2 tabular-nums font-mono text-sm text-muted-foreground pr-4">
                                <span>{formatDuration(projTotal)}</span>
                                <PctChip
                                  num={projTotal}
                                  den={g.totalDuration}
                                />
                              </TableCell>
                            </TableRow>

                            {/* Item rows */}
                            {isProjOpen &&
                              items.map((item, fi) => (
                                <TableRow
                                  key={fi}
                                  className="hover:bg-muted/10"
                                >
                                  <TableCell className="py-1.5 pl-[3.5rem] text-sm text-muted-foreground break-words whitespace-normal">
                                    {showRawTitles ? item.rawTitle : item.item}
                                  </TableCell>
                                  <TableCell className="text-right py-1.5 tabular-nums font-mono text-sm text-muted-foreground/60 pr-4">
                                    <span>{formatDuration(item.duration)}</span>
                                    <PctChip
                                      num={item.duration}
                                      den={g.totalDuration}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                          </React.Fragment>
                        );
                      })}

                      {/* Flat items */}
                      {flatItems.map((item, fi) => (
                        <TableRow key={fi} className="hover:bg-muted/10">
                          <TableCell className="py-1.5 pl-8 text-sm text-muted-foreground break-words whitespace-normal">
                            {showRawTitles ? item.rawTitle : item.item}
                          </TableCell>
                          <TableCell className="text-right py-1.5 tabular-nums font-mono text-sm text-muted-foreground/60 pr-4">
                            <span>{formatDuration(item.duration)}</span>
                            <PctChip
                              num={item.duration}
                              den={g.totalDuration}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
