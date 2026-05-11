"use client";

import { useState, useCallback } from "react";
import type { EventRow, BucketRow } from "./activityParser";

export type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "done";
      windowEvents: EventRow[];
      afkEvents: EventRow[];
      webEvents: EventRow[];
      buckets: BucketRow[];
    }
  | { status: "error"; message: string };

export function useSQLiteLoader() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle" });

  const loadFile = useCallback(async (file: File) => {
    setLoadState({ status: "loading" });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Dynamically import sql.js
      const initSqlJs = (await import("sql.js")).default;
      const SQL = await initSqlJs({
        locateFile: () => "/sql-wasm.wasm",
      });

      const db = new SQL.Database(uint8Array);

      // Query buckets
      const bucketResult = db.exec(
        "SELECT key, id, created, name, type, client, hostname, datastr FROM bucketmodel",
      );

      const buckets: BucketRow[] = [];
      if (bucketResult.length > 0) {
        const { columns, values } = bucketResult[0];
        for (const row of values) {
          const obj: Record<string, unknown> = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          buckets.push(obj as unknown as BucketRow);
        }
      }

      // Find window bucket, afk bucket, and chrome web watcher bucket
      const windowBucket = buckets.find(
        (b) =>
          b.client === "aw-watcher-window" ||
          b.id.startsWith("aw-watcher-window"),
      );
      const afkBucket = buckets.find(
        (b) =>
          b.client === "aw-watcher-afk" || b.id.startsWith("aw-watcher-afk"),
      );
      // Chrome web watcher — includes both "aw-watcher-web-chrome" and
      // "aw-watcher-web-chrome_hostname" variants; excludes edge/firefox.
      const webChromeBuckets = buckets.filter(
        (b) =>
          b.id.startsWith("aw-watcher-web-chrome") &&
          !b.id.startsWith("aw-watcher-web-chrome_web"),
      );

      if (!windowBucket || !afkBucket) {
        throw new Error(
          `Could not find required buckets. Found: ${buckets.map((b) => b.id).join(", ")}`,
        );
      }

      const queryEvents = (bucketKey: number): EventRow[] => {
        const result = db.exec(
          `SELECT id, bucket_id, timestamp, duration, datastr FROM eventmodel WHERE bucket_id = ${bucketKey}`,
        );
        if (result.length === 0) return [];
        const { columns, values } = result[0];
        return values.map((row) => {
          const obj: Record<string, unknown> = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj as unknown as EventRow;
        });
      };

      const windowEvents = queryEvents(windowBucket.key);
      const afkEvents = queryEvents(afkBucket.key);

      // Merge events from all chrome web watcher buckets
      const webEvents: EventRow[] = webChromeBuckets.flatMap((b) =>
        queryEvents(b.key),
      );

      db.close();

      setLoadState({
        status: "done",
        windowEvents,
        afkEvents,
        webEvents,
        buckets,
      });
    } catch (err) {
      setLoadState({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  return { loadState, loadFile };
}
