"use client";

import { useState, useTransition } from "react";
import { deleteAppointment, rescheduleAppointment, updateAppointmentStatus } from "./actions";

type Appointment = {
  id: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  patients?: { full_name: string; phone: string | null } | null;
};

// بيحول datetime-local (بيتوقع بدون timezone) للـ ISO string وبالعكس
function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export default function AppointmentRow({ appointment }: { appointment: Appointment }) {
  const a = appointment;
  const [editing, setEditing] = useState(false);
  const [dateValue, setDateValue] = useState(toLocalInputValue(a.appointment_date));
  const [duration, setDuration] = useState(String(a.duration_minutes ?? 30));
  const [notes, setNotes] = useState(a.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await rescheduleAppointment(a.id, dateValue, Number(duration), notes);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  function handleDelete() {
    if (!confirm(`متأكد إنك عاوز تمسح ميعاد ${a.patients?.full_name ?? ""}؟`)) return;
    startTransition(() => {
      deleteAppointment(a.id);
    });
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={5} className="bg-gray-50 p-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-2">
              ⚠ {error}
            </div>
          )}
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="label">التاريخ والوقت</label>
              <input
                type="datetime-local"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">المدة</label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className="input-field">
                <option value="15">15 دقيقة</option>
                <option value="30">30 دقيقة</option>
                <option value="45">45 دقيقة</option>
                <option value="60">ساعة</option>
                <option value="90">ساعة ونص</option>
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="label">ملاحظات</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="btn-primary text-sm disabled:opacity-50"
            >
              حفظ
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="btn-secondary text-sm"
            >
              إلغاء
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td data-label="التاريخ والوقت">
        {new Date(a.appointment_date).toLocaleString("ar-EG")}
        <span className="text-gray-400 text-xs"> · {a.duration_minutes ?? 30} د</span>
      </td>
      <td data-label="العيان">{a.patients?.full_name}</td>
      <td data-label="ملاحظات">{a.notes || "-"}</td>
      <td data-label="الحالة">
        <select
          defaultValue={a.status}
          disabled={isPending}
          onChange={(e) => {
            startTransition(() => {
              updateAppointmentStatus(a.id, e.target.value);
            });
          }}
          className="input-field py-1 text-xs"
        >
          <option value="scheduled">محجوز</option>
          <option value="completed">تم</option>
          <option value="cancelled">ملغي</option>
          <option value="no_show">لم يحضر</option>
        </select>
      </td>
      <td className="whitespace-nowrap">
        <button
          onClick={() => setEditing(true)}
          className="text-brand-600 hover:underline text-xs ml-3"
        >
          تعديل
        </button>
        <button onClick={handleDelete} className="text-red-500 hover:underline text-xs">
          مسح
        </button>
      </td>
    </tr>
  );
}
