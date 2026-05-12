"use client";

import { useCallback, useState } from "react";
import type { ProcessingMode } from "@/lib/activityParser";
import { cn } from "@/lib/utils";

export interface TimeRange {
  start: Date;
  end: Date;
}

type Preset = "today" | "yesterday" | "last7d" | "all" | "custom";

export function startOfDay(d: Date, mode: ProcessingMode = "custom") {
  if (mode === "aw") {
    const candidate = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      4,
      0,
      0,
      0,
    );
    return candidate > d ? new Date(candidate.getTime() - 86400000) : candidate;
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfDay(d: Date, mode: ProcessingMode = "custom") {
  if (mode === "aw") {
    return new Date(startOfDay(d, "aw").getTime() + 86400000 - 1);
  }
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

const PRESETS: { key: Preset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7d", label: "Last 7 days" },
  { key: "custom", label: "Custom" },
  { key: "all", label: "All time" },
];

export function TimeFilter({
  dataMax,
  value,
  onChange,
  mode,
}: {
  dataMax: Date;
  value: TimeRange | undefined;
  onChange: (range: TimeRange | undefined, preset: Preset) => void;
  mode: ProcessingMode;
}) {
  const [preset, setPreset] = useState<Preset>("today");
  const [customStart, setCustomStart] = useState(
    toDatetimeLocal(startOfDay(dataMax, mode)),
  );
  const [customEnd, setCustomEnd] = useState(
    toDatetimeLocal(endOfDay(dataMax, mode)),
  );

  const applyPreset = useCallback(
    (p: Preset) => {
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
      const todayStart = startOfDay(dataMax, mode);
      if (p === "today") {
        onChange({ start: todayStart, end: endOfDay(dataMax, mode) }, p);
      } else if (p === "yesterday") {
        const yStart = new Date(todayStart.getTime() - 86400000);
        const yEnd = new Date(todayStart.getTime() - 1);
        onChange({ start: yStart, end: yEnd }, p);
      } else if (p === "last7d") {
        const s = new Date(todayStart.getTime() - 6 * 86400000);
        onChange({ start: s, end: endOfDay(dataMax, mode) }, p);
      }
    },
    [dataMax, customStart, customEnd, onChange, mode],
  );

  const applyCustom = useCallback(() => {
    const s = new Date(customStart);
    const e = new Date(customEnd);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      onChange({ start: s, end: e }, "custom");
    }
  }, [customStart, customEnd, onChange]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => applyPreset(key)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-all",
              preset === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
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

      {preset === "all" && (
        <p className="text-xs text-muted-foreground">
          Showing all recorded data
        </p>
      )}
      {preset !== "all" && value && (
        <p className="text-xs text-muted-foreground">
          {fmtShort(value.start)} <span className="opacity-50">→</span>{" "}
          {fmtShort(value.end)}
        </p>
      )}
    </div>
  );
}
