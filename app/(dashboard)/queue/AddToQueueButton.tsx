"use client";

import { useState, useTransition } from "react";
import { addToQueue } from "./actions";

export default function AddToQueueButton({
  patientId,
  appointmentId,
}: {
  patientId?: string;
  appointmentId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  function handleClick() {
    if (!patientId) return;
    setError(null);
    startTransition(async () => {
      const result = await addToQueue(patientId, appointmentId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setAdded(true);
    });
  }

  if (added) {
    return <span className="text-xs text-green-600 dark:text-green-400 shrink-0">اتضاف ✓</span>;
  }

  return (
    <div className="shrink-0 text-left">
      <button
        onClick={handleClick}
        disabled={isPending || !patientId}
        className="btn-secondary py-1 text-xs disabled:opacity-50"
      >
        {isPending ? "..." : "إضافة للطابور"}
      </button>
      {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
    </div>
  );
}
