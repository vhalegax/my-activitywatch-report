"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/activityParser";
import type { AppGroup, TitleGroup } from "@/lib/activityParser";
import { cn } from "@/lib/utils";

// ─── Deterministic color ──────────────────────────────────────────────────────

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
          <span className="opacity-40 mr-1.5">↗</span>
          {url}
        </span>
        <span className="text-xs font-mono text-muted-foreground/70 shrink-0 tabular-nums">
          {formatDuration(duration)}
        </span>
      </div>
      <div className="h-0.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full opacity-50 transition-all"
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
            {hasUrls ? (
              <span className="text-muted-foreground text-[10px] shrink-0 w-3">
                {open ? "▾" : "▸"}
              </span>
            ) : (
              <span className="w-3 shrink-0" />
            )}
            <span
              className="text-sm text-foreground/80 break-words"
              title={group.title || "(no title)"}
            >
              {group.title || (
                <em className="text-muted-foreground not-italic">no title</em>
              )}
            </span>
          </div>
          <span className="text-xs font-mono text-muted-foreground shrink-0 tabular-nums">
            {formatDuration(group.totalDuration)}
          </span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full opacity-40 transition-all"
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

export function AppCard({
  group,
  totalActive,
}: {
  group: AppGroup;
  totalActive: number;
}) {
  const [open, setOpen] = useState(false);
  const pct = totalActive > 0 ? (group.totalDuration / totalActive) * 100 : 0;
  const color = appColor(group.app);
  const initial = group.app.charAt(0).toUpperCase();

  return (
    <div
      className="rounded-xl border bg-card overflow-hidden transition-shadow hover:shadow-sm"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex flex-col gap-2.5 px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ backgroundColor: color }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-sm tracking-tight truncate">
                {group.app}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="text-sm font-mono font-semibold tabular-nums"
                  style={{ color }}
                >
                  {formatDuration(group.totalDuration)}
                </span>
                <span className="text-[11px] text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted tabular-nums">
                  {pct.toFixed(0)}%
                </span>
                <span className="text-muted-foreground text-[11px] w-3">
                  {open ? "▴" : "▾"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </button>

      {open && (
        <div className="border-t px-2 pb-2 pt-1 space-y-0.5 bg-muted/10">
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
