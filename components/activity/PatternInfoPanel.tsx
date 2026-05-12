export function PatternInfoPanel() {
  return (
    <div className="rounded-xl border bg-card px-4 py-4 space-y-4">
      <p className="text-sm font-semibold text-foreground/80">
        Grouping Pattern Reference
      </p>

      {/* Pattern A */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold text-foreground/50 uppercase tracking-widest">
          Pattern A — Custom Rules
        </p>
        <p className="text-xs text-muted-foreground">
          Highest priority. Match by app name + title regex → assign to a named
          group. Configured in the ⚙ Rules panel.
        </p>
      </div>

      {/* Pattern B */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold text-foreground/50 uppercase tracking-widest">
          Pattern B — Last-Segment
        </p>
        <p className="text-xs text-muted-foreground">
          Applies to <code className="bg-muted px-1 rounded text-xs">Code</code>{" "}
          and <code className="bg-muted px-1 rounded text-xs">Postman</code>.
          Title is split at the <em>rightmost</em>{" "}
          <code className="bg-muted px-1 rounded text-xs"> — </code> or{" "}
          <code className="bg-muted px-1 rounded text-xs"> - </code>; right side
          = group, left side = item.
        </p>
        <p className="bg-muted/50 rounded-lg px-3 py-2 font-mono text-xs leading-relaxed">
          &ldquo;Get List by ID - my-project&rdquo;
          <br />→ Group:{" "}
          <strong className="text-foreground/70">my-project</strong>, Item:{" "}
          <strong className="text-foreground/70">Get List by ID</strong>
        </p>
      </div>

      {/* Pattern C */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold text-foreground/50 uppercase tracking-widest">
          Pattern C — Browser Host
        </p>
        <p className="text-xs text-muted-foreground">
          Applies to{" "}
          <code className="bg-muted px-1 rounded text-xs">Google Chrome</code>,{" "}
          <code className="bg-muted px-1 rounded text-xs">Brave Browser</code>,
          and{" "}
          <code className="bg-muted px-1 rounded text-xs">Microsoft Edge</code>.
          Groups by the host in the AW token{" "}
          <code className="bg-muted px-1 rounded text-xs">_|⌈h=… p=…⌉|_</code>;
          the token is stripped from the displayed title. Entries with identical
          stripped titles are merged (durations summed). Titles without the
          token fall into{" "}
          <code className="bg-muted px-1 rounded text-xs">(other)</code>.
        </p>
        <p className="bg-muted/50 rounded-lg px-3 py-2 font-mono text-xs leading-relaxed">
          &ldquo;Meet - Foo _|⌈h=meet.google.com p=/abc⌉|_ - Mic - Chrome&rdquo;
          <br />→ Group:{" "}
          <strong className="text-foreground/70">meet.google.com</strong>, Item:{" "}
          <strong className="text-foreground/70">
            Meet - Foo - Mic - Chrome
          </strong>
        </p>
      </div>

      {/* Fallback */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold text-foreground/50 uppercase tracking-widest">
          Fallback — Flat
        </p>
        <p className="text-xs text-muted-foreground">
          All other apps: no grouping, titles are listed directly under the app.
        </p>
      </div>

      <p className="text-[11px] text-muted-foreground/60 border-t pt-3">
        Priority: <strong className="text-foreground/50">A</strong> Custom Rules
        → <strong className="text-foreground/50">B</strong> Last-Segment →{" "}
        <strong className="text-foreground/50">C</strong> Browser Host → Flat
      </p>
    </div>
  );
}
