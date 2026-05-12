# my-activitywatch-report

A personal, offline-first web app to visualize and analyze your daily computer activity from [ActivityWatch](https://activitywatch.net) — directly in the browser, without any server or cloud upload.

---

## What is This?

[ActivityWatch](https://activitywatch.net) is an open-source time tracker that records which apps and window titles you use throughout the day. It stores all data locally in a SQLite database.

**my-activitywatch-report** reads that SQLite file directly in the browser (using [sql.js](https://github.com/sql-js/sql.js)), processes the raw event data, and presents it as a clean, interactive activity report — grouped by app, domain, or project.

No data ever leaves your machine.

---

## Features

- **Drag & drop your ActivityWatch SQLite file** — no install, no login, no server
- **Smart grouping** by app, using three built-in pattern strategies:
  - **Pattern A — Custom Rules**: define your own regex rules to group window titles into custom categories
  - **Pattern B — Last-Segment**: automatic grouping for `Code` and `Postman` — splits title by the rightmost ` — ` or ` - ` separator (e.g. `"index.ts — my-project"` → group: `my-project`)
  - **Pattern C — Browser Host**: automatic grouping for `Google Chrome`, `Brave Browser`, and `Microsoft Edge` — extracts host from the ActivityWatch browser title token (`_|⌈h=… p=…⌉|_`), strips the token from the displayed title, and merges entries with identical stripped titles (durations are summed)
- **Time filter** — filter by day, week, or custom range
- **AFK-aware** — excludes idle/AFK time for accurate active-time reporting
- **Copy View** — copy the full grouped report as structured text (app → group → item with %)
- **Copy CSV** — copy raw data as CSV (app, title, duration seconds)
- **Raw / Formatted title toggle** — switch between the original title and the cleaned-up extracted item label
- **Persistent custom rules** — rules are saved in `localStorage` and survive page refresh

---

## Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [ActivityWatch](https://activitywatch.net) installed and running on your machine

### 2. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/my-activitywatch-report.git
cd my-activitywatch-report
npm install
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:7020](http://localhost:7020) in your browser.

### 4. Export Your ActivityWatch Database

ActivityWatch stores its data in a SQLite file. Find it at:

| OS | Path |
|---|---|
| **macOS** | `~/Library/Application Support/activitywatch/aw-server/peewee-sqlite.v2.db` |
| **Linux** | `~/.local/share/activitywatch/aw-server/peewee-sqlite.v2.db` |
| **Windows** | `%APPDATA%\activitywatch\aw-server\peewee-sqlite.v2.db` |

Drag and drop that file into the app, and your report will be generated instantly.

---

## How Grouping Works

### Priority Order

```
① Pattern A (Custom Rules)
   ↓ no match
② Pattern B (Last-Segment) — Code, Postman
   ↓ not applicable
③ Pattern C (Browser Host) — Chrome, Brave, Edge
   ↓ no pattern token found
④ Fallback — Flat (no grouping)
```

### Pattern A — Custom Rules

Configured via the ⚙ Rules panel in the UI. Each rule specifies:
- **App**: selected from a dropdown of all detected apps
- **Title regex**: a regex matched against the window title (case-insensitive)
- **Group name**: the label to assign when the regex matches

Rules are applied in order; the first match wins. If the app has rules but none match, the title falls into `(other)`.

### Pattern B — Last-Segment

Applies to `Code` and `Postman`. Splits the title at the **rightmost** ` — ` or ` - `:

```
"index.ts — my-project"
→ Group: my-project | Item: index.ts

"GET /users - my-api"
→ Group: my-api | Item: GET /users
```

### Pattern C — Browser Host

Applies to `Google Chrome`, `Brave Browser`, and `Microsoft Edge`.

ActivityWatch's browser extension appends a token to window titles:

```
Home / X _|⌈h=x.com p=/home⌉|_ - Google Chrome - John Doe
```

This app:
1. Extracts the host (`x.com`) as the **group**
2. Strips the token → `Home / X - Google Chrome - John Doe` becomes the **item**
3. **Merges** entries whose stripped titles are identical (sums their durations) — this handles cases where AW records the same tab both with and without the token due to timing

Titles without the token fall into `(other)`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui |
| SQLite in browser | [sql.js](https://github.com/sql-js/sql.js) (WebAssembly) |

---

## Project Structure

```
app/
  page.tsx              — main page (upload + report)
  layout.tsx            — HTML shell + metadata
components/
  activity/
    ListTab.tsx           — grouped activity table + toolbar
    AppCard.tsx           — per-app summary card
    StatsRow.tsx          — top-level stats (total active time, etc.)
    TimeFilter.tsx        — date range picker
    UploadZone.tsx        — drag-and-drop SQLite file loader
    RulesEditor.tsx       — custom grouping rules UI
    PatternInfoPanel.tsx  — grouping pattern reference docs
lib/
  activityParser.ts     — SQLite → ReportData processing (AFK filtering, flood fill)
  listRules.ts          — grouping logic (resolveGroup, extractBrowserInfo, etc.)
  useSQLiteLoader.ts    — React hook to load SQLite file via sql.js
  utils.ts              — shared utilities
```

---

## Privacy

All processing happens **entirely in your browser**. The SQLite file is read into memory via the [File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API) and never uploaded anywhere. Closing the tab discards all data.

Custom rules are stored only in your browser's `localStorage`.

---

## License

MIT
