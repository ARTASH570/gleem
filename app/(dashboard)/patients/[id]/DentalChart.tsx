"use client";

import { useState, useTransition } from "react";
import { updateToothStatus } from "../actions";

type ToothRecord = {
  tooth_number: number;
  status: string;
  notes: string | null;
};

const STATUS_OPTIONS = [
  { value: "sound", label: "سليمة", color: "bg-white border-gray-300", fill: "#ffffff" },
  { value: "filled", label: "محشوة", color: "bg-blue-200 border-blue-400", fill: "#bfdbfe" },
  { value: "decayed", label: "بها تسوس", color: "bg-red-200 border-red-400", fill: "#fecaca" },
  { value: "missing", label: "مخلوعة", color: "bg-gray-300 border-gray-400", fill: "#d1d5db" },
  { value: "crown", label: "تاج", color: "bg-yellow-200 border-yellow-400", fill: "#fef08a" },
  { value: "root_canal", label: "عصب", color: "bg-purple-200 border-purple-400", fill: "#e9d5ff" },
  { value: "needs_treatment", label: "محتاجة علاج", color: "bg-orange-200 border-orange-400", fill: "#fed7aa" },
];

// نفس ترقيمنا العام من 1 لـ 32 زي ما هو (1-16 الفك العلوي، 17-32 الفك
// السفلي) — بس هنا بنقسمهم لأرباع (يمين/شمال) عشان الشكل يبقى قريب من
// شكل مخططات الأسنان المعروفة، من غير ما نغيّر الترقيم المخزّن فعليًا
const UPPER_RIGHT = Array.from({ length: 8 }, (_, i) => i + 1); // 1..8
const UPPER_LEFT = Array.from({ length: 8 }, (_, i) => i + 9); // 9..16
const LOWER_RIGHT = Array.from({ length: 8 }, (_, i) => 32 - i); // 32..25
const LOWER_LEFT = Array.from({ length: 8 }, (_, i) => 24 - i); // 24..17

function statusMeta(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
}

// أيقونة سنة بسيطة (تاج + جذرين) بدل المربع القديم
function ToothIcon({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0">
      <path
        d="M12 2.5c-2.6 0-4.6 1.7-5.5 3.5C5.7 7.6 5.5 9.4 5.5 11c0 2.8.9 5.6 1.9 7.6.5 1 1.4 1.9 2.3 1 .6-.6.5-1.9.5-2.9 0-.9.4-1.4 1.3-1.4h1c.9 0 1.3.5 1.3 1.4 0 1 0 2.3.5 2.9.9.9 1.8 0 2.3-1 1-2 1.9-4.8 1.9-7.6 0-1.6-.2-3.4-1-5C16.6 4.2 14.6 2.5 12 2.5z"
        fill={fill}
        stroke="#9ca3af"
        strokeWidth="1"
      />
    </svg>
  );
}

export default function DentalChart({
  patientId,
  initialTeeth,
}: {
  patientId: string;
  initialTeeth: ToothRecord[];
}) {
  const [teethMap, setTeethMap] = useState<Map<number, ToothRecord>>(
    new Map(initialTeeth.map((t) => [t.tooth_number, t]))
  );
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = selectedTooth ? teethMap.get(selectedTooth) : null;

  function handleSave(status: string, notes: string) {
    if (!selectedTooth) return;
    setTeethMap((prev) => {
      const next = new Map(prev);
      next.set(selectedTooth, { tooth_number: selectedTooth, status, notes });
      return next;
    });
    startTransition(() => {
      updateToothStatus(patientId, selectedTooth, status, notes);
    });
    setSelectedTooth(null);
  }

  function ToothButton({ num }: { num: number }) {
    const record = teethMap.get(num);
    const meta = statusMeta(record?.status ?? "sound");
    return (
      <button
        type="button"
        onClick={() => setSelectedTooth(num)}
        className="flex flex-col items-center gap-0.5 p-1 rounded-lg hover:bg-brand-50 dark:hover:bg-gray-700"
        title={`سنة ${num} - ${meta.label}`}
      >
        <ToothIcon fill={meta.fill} />
        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">{num}</span>
      </button>
    );
  }

  function Quadrant({ label, teeth, alignEnd }: { label: string; teeth: number[]; alignEnd?: boolean }) {
    return (
      <div className="flex-1 min-w-0">
        <p
          className={`text-[10px] text-gray-400 dark:text-gray-500 mb-1 ${
            alignEnd ? "text-right" : "text-left"
          }`}
        >
          {label}
        </p>
        <div className="flex flex-wrap gap-0.5 justify-center bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
          {teeth.map((n) => (
            <ToothButton key={n} num={n} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1 mb-1">
        <Quadrant label="علوي يمين" teeth={UPPER_RIGHT} alignEnd />
        <div className="w-px bg-gray-200 dark:bg-gray-700 shrink-0" />
        <Quadrant label="علوي يسار" teeth={UPPER_LEFT} />
      </div>
      <div className="flex gap-1">
        <Quadrant label="سفلي يمين" teeth={LOWER_RIGHT} alignEnd />
        <div className="w-px bg-gray-200 dark:bg-gray-700 shrink-0" />
        <Quadrant label="سفلي يسار" teeth={LOWER_LEFT} />
      </div>

      <div className="flex flex-wrap gap-2 mt-3 text-[10px] dark:text-gray-300">
        {STATUS_OPTIONS.map((s) => (
          <div key={s.value} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded border ${s.color}`} />
            {s.label}
          </div>
        ))}
      </div>

      {selectedTooth && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 w-full max-w-sm">
            <h3 className="font-bold mb-3 dark:text-gray-100">سنة رقم {selectedTooth}</h3>
            <ToothEditor
              record={selected}
              onCancel={() => setSelectedTooth(null)}
              onSave={handleSave}
              saving={isPending}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ToothEditor({
  record,
  onCancel,
  onSave,
  saving,
}: {
  record?: ToothRecord | null;
  onCancel: () => void;
  onSave: (status: string, notes: string) => void;
  saving: boolean;
}) {
  const [status, setStatus] = useState(record?.status ?? "sound");
  const [notes, setNotes] = useState(record?.notes ?? "");

  return (
    <div className="space-y-3">
      <div>
        <label className="label">الحالة</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">ملاحظات</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="input-field"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave(status, notes)}
          disabled={saving}
          className="btn-primary flex-1"
        >
          {saving ? "جاري الحفظ..." : "حفظ"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          إلغاء
        </button>
      </div>
    </div>
  );
}
