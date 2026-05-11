# ActivityWatch Report — Ideas & Roadmap

Pilih yang mau diimplementasi, lalu kasih tau gue mana yang diprioritaskan.

---

## 📊 Report Views (Group By)

### ✅ Done: App Report (App → Title → URL)

Hierarchical breakdown per app, title, URL. Already implemented.

---

### 1. Domain Report

Group by domain yang diekstrak dari URL.

- Level 1: Domain (e.g. `github.com`, `notion.so`, `youtube.com`)
- Level 2: Path / page title
- Filter otomatis hanya event dengan URL

Berguna untuk: ngeliat browser usage by site.

---

### 2. Category Report (Regex-defined Categories)

User bisa define kategori sendiri via regex rule yang diapply ke `app` / `title` / `url`.

Contoh rules:

```
Work:            /github|vscode|linear|jira|notion/i
Communication:   /slack|discord|teams|zoom|whatsapp/i
Entertainment:   /youtube|netflix|spotify|twitch/i
Research:        /google|stackoverflow|mdn|wikipedia/i
```

Tampilan: pie chart atau bar chart per kategori + % waktu.

**Kenapa bagus:** Bisa jawab "gue produktif berapa jam hari ini?"

---

### 3. Hour-of-Day Heatmap

Tampilkan aktivitas per jam dalam hari sebagai heatmap.

```
00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23
░░ ░░ ░░ ░░ ░░ ░░ ██ ██ ███████████████ ██ ███████████ ██ ░░ ░░ ░░ ░░
```

Berguna untuk: ngeliat jam produktif dan pola kerja harian.

---

### 4. Timeline View

Horizontal visual timeline per hari, color-coded per app.

```
08:00      09:00      10:00      11:00      12:00
[──VS Code──][─Chrome─][────────VS Code────────][Slack]
```

Bisa scroll horizontal, zoom in/out per jam.  
Berguna untuk: ngeliat alur kerja secara kronologis.

---

### 5. Focus Sessions Report

Deteksi "focus session" = blok kerja tidak terganggu > threshold (e.g. >25 menit).

Metrics yang ditampilkan:

- Jumlah focus sessions hari ini
- Rata-rata panjang session
- Longest session
- Apps yang paling sering jadi focus app

Berguna untuk: Pomodoro-style insight.

---

### 6. Day Comparison

Bandingkan dua hari / range tanggal side by side.

Layout: dua kolom, masing-masing satu date range.
Diff indicator: app X naik/turun berapa % dibanding sebelumnya.

Berguna untuk: "Hari Senin gue lebih produktif dari Jumat?"

---

### 7. Top Titles (Flat List)

Flat list semua window titles (tanpa grouping by app), sorted by total time.

Berguna untuk: tau persis "gue ngapain aja" tanpa filter per app.

---

## 🔍 Filters

### ✅ Done: Time Range Filter

Preset (Today, Yesterday, Last 7d, All) + Custom datetime range.

---

### 8. App Filter (Regex Include/Exclude)

Input regex yang diapply ke field `app`.

Mode:

- **Include only:** hanya tampilkan app yang match
- **Exclude:** sembunyikan app yang match

Contoh use case:

- Include: `/Google Chrome|Firefox|Safari/` → lihat hanya browser usage
- Exclude: `/loginwindow|SystemUIServer/` → buang sistem noise

---

### 9. Title Filter (Regex)

Sama seperti App Filter tapi ke field `title`.

Contoh: `/pull request|code review|bug/i` → lihat waktu habis berapa di PR review.

---

### 10. URL Filter (Regex)

Diapply ke field `url` (hanya untuk event dari browser watcher).

Contoh: `/^https:\/\/github\.com\/myorg/` → waktu di repo tertentu.

---

### 11. Duration Filter (Min/Max per event)

Filter event berdasarkan `duration` masing-masing event.

- **Min duration:** buang event sangat pendek (noise alt-tab, < 2 detik)
- **Max duration:** buang event yang terlalu panjang (mungkin data aneh)

Default yang disarankan: min = 2s, max = tidak terbatas.

---

### 12. Combined Filter Builder (Advanced)

UI untuk stack multiple filters dengan logic AND/OR.

Tiap filter:

- Field: `app` / `title` / `url` / `duration`
- Operator: `matches` / `not matches` / `>=` / `<=`
- Value: regex string atau angka

Cocok untuk power user yang mau slice data spesifik.

---

## 📤 Export

### 13. Export to CSV

Export data grouped (App, Title, URL, Duration) ke CSV.  
Bisa langsung buka di Excel / Google Sheets.

---

### 14. Export to JSON

Export raw filtered events atau grouped report ke JSON.  
Berguna untuk processing lebih lanjut.

---

### 15. Shareable Config via URL

Encode konfigurasi (time range + filter rules) ke URL query params.  
File tidak diinclude (privasi), tapi config bisa dishare ke orang lain dengan DB yang sama.

---

## 🎯 Other Ideas

### 16. Productivity Score

Formula: `(not-afk time / total session time) × 100`  
Bisa dikurangi "entertainment time" kalau kategori sudah didefinisikan.

---

### 17. App Switch Frequency

Hitung berapa kali ganti app per jam.  
High frequency = context-switching banyak = mungkin distracted.

---

### 18. Idle Gap Detection

Tampilkan gaps dalam aktivitas yang lebih panjang dari threshold (e.g. > 15 menit).  
Bisa detect waktu makan siang, istirahat, dll.

---

### 19. Min Duration Global Setting

Setting global di atas halaman:

> "Exclude events shorter than [___] seconds"

Default: 2 detik. Mengurangi noise dari alt-tab dan window flash.

---

### 20. Dark/Light Mode Toggle

Manual toggle di header, override OS preference.

---

## Priority Order (Usulan)

| Priority | Feature                       | Effort |
| -------- | ----------------------------- | ------ |
| 🔥 High  | Category Report (regex rules) | Medium |
| 🔥 High  | App/Title/URL Filter (regex)  | Low    |
| 🔥 High  | Min Duration Filter           | Low    |
| 🟡 Med   | Domain Report                 | Low    |
| 🟡 Med   | Hour Heatmap                  | Medium |
| 🟡 Med   | Export CSV                    | Low    |
| 🟢 Low   | Timeline View                 | High   |
| 🟢 Low   | Focus Sessions                | Medium |
| 🟢 Low   | Day Comparison                | High   |
