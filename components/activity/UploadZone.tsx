"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function UploadZone({ onFile }: { onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "w-full max-w-sm border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-6 cursor-pointer transition-all duration-200 select-none",
          dragging
            ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30 scale-[1.02]"
            : "border-border hover:border-violet-400 hover:bg-muted/20",
        )}
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="12" y2="12" />
            <line x1="15" y1="15" x2="12" y2="12" />
          </svg>
        </div>

        <div className="text-center space-y-1.5">
          <p className="text-base font-semibold tracking-tight">
            Drop your ActivityWatch database
          </p>
          <p className="text-sm text-muted-foreground">
            .db · .sqlite · .sqlite3
          </p>
        </div>

        <div className="flex items-center gap-3 w-full max-w-[200px]">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Browse file
        </span>

        <input
          ref={inputRef}
          type="file"
          accept=".db,.sqlite,.sqlite3"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </div>

      <p className="mt-5 text-xs text-muted-foreground/60 text-center max-w-xs">
        Processed entirely in your browser — your data never leaves your device.
      </p>
    </div>
  );
}
