"use client";

import type { UserRule } from "@/lib/listRules";

export function RulesEditor({
  rules,
  appNames,
  onChange,
}: {
  rules: UserRule[];
  appNames: string[];
  onChange: (rules: UserRule[]) => void;
}) {
  const add = () =>
    onChange([
      ...rules,
      {
        id: crypto.randomUUID(),
        app: appNames[0] ?? "",
        titleRegex: "",
        groupName: "",
      },
    ]);

  const remove = (id: string) => onChange(rules.filter((r) => r.id !== id));

  const update = (id: string, patch: Partial<UserRule>) =>
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Grouping Rules</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Code &amp; Postman use built-in last-segment grouping automatically.
          </p>
        </div>
        <button
          onClick={add}
          className="text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors font-medium shrink-0"
        >
          + Add rule
        </button>
      </div>

      {rules.length === 0 && (
        <p className="text-xs text-muted-foreground/60 italic py-1">
          No custom rules yet.
        </p>
      )}

      <div className="space-y-2">
        {rules.map((rule, i) => (
          <div
            key={rule.id}
            className="rounded-lg border bg-muted/20 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Rule {i + 1}
              </span>
              <button
                onClick={() => remove(rule.id)}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Remove rule"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground font-medium">
                  App
                </label>
                <select
                  value={rule.app}
                  onChange={(e) => update(rule.id, { app: e.target.value })}
                  className="w-full h-8 text-xs rounded-md border bg-background px-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {appNames.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground font-medium">
                  Title regex
                </label>
                <input
                  value={rule.titleRegex}
                  onChange={(e) =>
                    update(rule.id, { titleRegex: e.target.value })
                  }
                  placeholder="e.g. github\.com"
                  className="w-full h-8 text-xs rounded-md border bg-background px-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground font-medium">
                  Group name
                </label>
                <input
                  value={rule.groupName}
                  onChange={(e) =>
                    update(rule.id, { groupName: e.target.value })
                  }
                  placeholder="e.g. GitHub"
                  className="w-full h-8 text-xs rounded-md border bg-background px-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
