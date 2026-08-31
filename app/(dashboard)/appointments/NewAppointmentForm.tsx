"use client";

import { useState, useTransition } from "react";
import { createAppointment } from "./actions";
import PatientCombobox from "./PatientCombobox";

export default function NewAppointmentForm({
  patients,
}: {
  patients: { id: string; full_name: string }[];
}) {
  const [patientId, setPatientId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");
  const [bookingSource, setBookingSource] = useState("reception");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createAppointment(patientId, appointmentDate, Number(duration), notes, bookingSource);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setPatientId("");
      setAppointmentDate("");
      setDuration("30");
      setNotes("");
      setBookingSource("reception");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          ⚠ {error}
        </div>
      )}
      <div>
        <label className="label">العيان</label>
        <PatientCombobox patients={patients} value={patientId} onChange={setPatientId} />
      </div>
      <div>
        <label className="label">التاريخ والوقت</label>
        <input
          type="datetime-local"
          required
          value={appointmentDate}
          onChange={(e) => setAppointmentDate(e.target.value)}
          className="input-field"
        />
      </div>
      <div>
        <label className="label">مدة الموعد</label>
        <select value={duration} onChange={(e) => setDuration(e.target.value)} className="input-field">
          <option value="15">15 دقيقة</option>
          <option value="30">30 دقيقة</option>
          <option value="45">45 دقيقة</option>
          <option value="60">ساعة</option>
          <option value="90">ساعة ونص</option>
        </select>
      </div>
      <div>
        <label className="label">مصدر الحجز</label>
        <select
          value={bookingSource}
          onChange={(e) => setBookingSource(e.target.value)}
          className="input-field"
        >
          <option value="reception">ريسبشن</option>
          <option value="whatsapp">واتساب</option>
        </select>
      </div>
      <div>
        <label className="label">ملاحظات</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input-field"
        />
      </div>
      <button disabled={isPending || !patientId} className="btn-primary w-full disabled:opacity-50">
        {isPending ? "جاري الحجز..." : "حجز الموعد"}
      </button>
    </form>
  );
}
