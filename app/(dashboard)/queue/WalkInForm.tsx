"use client";

import { useState, useTransition } from "react";
import PatientCombobox from "../appointments/PatientCombobox";
import { addToQueue } from "./actions";

export default function WalkInForm({ patients }: { patients: { id: string; full_name: string }[] }) {
  const [patientId, setPatientId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) return;
    setError(null);
    startTransition(async () => {
      const result = await addToQueue(patientId, null);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setPatientId("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-300">
          ⚠ {error}
        </div>
      )}
      <PatientCombobox patients={patients} value={patientId} onChange={setPatientId} />
      <button disabled={isPending || !patientId} className="btn-primary w-full disabled:opacity-50">
        {isPending ? "جاري الإضافة..." : "إضافة زيارة مباشرة للطابور"}
      </button>
    </form>
  );
}
