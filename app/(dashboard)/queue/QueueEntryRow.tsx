"use client";

import { useState, useTransition } from "react";
import { startQueueEntry, completeQueueEntry, skipQueueEntry } from "./actions";

export default function QueueEntryRow({
  entryId,
  role,
  status,
  canStart = false,
}: {
  entryId: string;
  role: string;
  status: "waiting" | "in_progress";
  canStart?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStart() {
    setError(null);
    startTransition(async () => {
      const result = await startQueueEntry(entryId);
      if (result?.error) setError(result.error);
    });
  }

  function handleComplete() {
    startTransition(() => {
      completeQueueEntry(entryId);
    });
  }

  function handleSkip() {
    startTransition(() => {
      skipQueueEntry(entryId);
    });
  }

  if (status === "in_progress") {
    if (role !== "doctor") return null;
    return (
      <button
        onClick={handleComplete}
        disabled={isPending}
        className="btn-primary py-1 text-xs disabled:opacity-50 shrink-0"
      >
        {isPending ? "..." : "إنهاء الكشف ✓"}
      </button>
    );
  }

  // status === "waiting"
  return (
    <div className="shrink-0 text-left">
      <div className="flex gap-1">
        {role === "doctor" && (
          <button
            onClick={handleStart}
            disabled={isPending || !canStart}
            title={!canStart ? "لازم تخلّص مع اللي جوه الكشف الأول" : ""}
            className="btn-primary py-1 text-xs disabled:opacity-50"
          >
            {isPending ? "..." : "ابدأ ▶"}
          </button>
        )}
        <button
          onClick={handleSkip}
          disabled={isPending}
          className="btn-secondary py-1 text-xs disabled:opacity-50"
        >
          تخطي
        </button>
      </div>
      {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
    </div>
  );
}
