"use client";

import { formatDuration } from "@/lib/activityParser";

export function StatsRow({
  totalActive,
  appCount,
  eventCount,
}: {
  totalActive: number;
  appCount: number;
  eventCount: number;
}) {
  const stats = [
    {
      label: "Active Time",
      value: formatDuration(totalActive),
      sub: "net of AFK",
      color: "#8b5cf6",
      bg: "bg-violet-500/8",
    },
    {
      label: "Apps",
      value: appCount.toString(),
      sub: "unique apps",
      color: "#3b82f6",
      bg: "bg-blue-500/8",
    },
    {
      label: "Events",
      value:
        eventCount > 999
          ? `${(eventCount / 1000).toFixed(1)}k`
          : eventCount.toString(),
      sub: "window events",
      color: "#10b981",
      bg: "bg-emerald-500/8",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {stats.map(({ label, value, sub, color, bg }) => (
        <div
          key={label}
          className={`rounded-xl border px-4 py-3 space-y-0.5 ${bg}`}
        >
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p
            className="text-xl font-bold font-mono tabular-nums leading-tight"
            style={{ color }}
          >
            {value}
          </p>
          <p className="text-[11px] text-muted-foreground">{sub}</p>
        </div>
      ))}
    </div>
  );
}
