"use client";

import { useMemo, useState } from "react";

type Patient = { id: string; full_name: string };

// بحث بسيط بالاسم بدل select طويل. الفلترة بتحصل في المتصفح على
// نفس القايمة اللي المفروض أصلاً متجابة من السيرفر (مناسب لعدد
// العيانين المتوسط في عيادة واحدة؛ لو العدد كبر جدًا في المستقبل
// نحولها لبحث server-side زي صفحة /search).
export default function PatientCombobox({
  patients,
  value,
  onChange,
}: {
  patients: Patient[];
  value: string;
  onChange: (patientId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = patients.find((p) => p.id === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return patients.slice(0, 30);
    const q = query.trim().toLowerCase();
    return patients.filter((p) => p.full_name.toLowerCase().includes(q)).slice(0, 30);
  }, [query, patients]);

  return (
    <div className="relative">
      <input
        type="text"
        className="input-field"
        placeholder="اكتب اسم العيان..."
        value={open ? query : selected?.full_name ?? ""}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => {
          // تأخير بسيط عشان الـ click على عنصر من القايمة يتسجل الأول
          setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && (
        <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
          {filtered.length === 0 && <li className="px-3 py-2 text-gray-400">مفيش نتائج</li>}
          {filtered.map((p) => (
            <li
              key={p.id}
              className="px-3 py-2 hover:bg-brand-50 cursor-pointer"
              onMouseDown={() => {
                onChange(p.id);
                setOpen(false);
              }}
            >
              {p.full_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
