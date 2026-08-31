"use client";

import { useState, useTransition } from "react";
import { createPatient } from "../actions";

const initialState = {
  fullName: "",
  phone: "",
  nationalId: "",
  birthDate: "",
  gender: "",
  address: "",
  medicalNotes: "",
};

export default function NewPatientForm() {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(confirmDuplicate: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await createPatient({
        fullName: form.fullName,
        phone: form.phone,
        nationalId: form.nationalId,
        birthDate: form.birthDate,
        gender: form.gender,
        address: form.address,
        medicalNotes: form.medicalNotes,
        confirmDuplicate,
      });
      // لو نجح الحفظ، الـ action بتعمل redirect من جوه فمش هيرجع هنا خالص
      if (result?.duplicateWarning) {
        setDuplicateWarning(result.duplicateWarning);
        return;
      }
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDuplicateWarning(null);
        submit(false);
      }}
      className="card space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">الاسم بالكامل *</label>
          <input
            required
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="label">رقم التليفون</label>
          <input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">الرقم القومي</label>
          <input
            value={form.nationalId}
            onChange={(e) => update("nationalId", e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="label">تاريخ الميلاد</label>
          <input
            type="date"
            value={form.birthDate}
            onChange={(e) => update("birthDate", e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="label">النوع</label>
        <select
          value={form.gender}
          onChange={(e) => update("gender", e.target.value)}
          className="input-field"
        >
          <option value="">اختر</option>
          <option value="male">ذكر</option>
          <option value="female">أنثى</option>
        </select>
      </div>

      <div>
        <label className="label">العنوان</label>
        <input
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          className="input-field"
        />
      </div>

      <div>
        <label className="label">ملاحظات طبية (حساسية، أمراض مزمنة...)</label>
        <textarea
          rows={3}
          value={form.medicalNotes}
          onChange={(e) => update("medicalNotes", e.target.value)}
          className="input-field"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {duplicateWarning && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-3 py-2 space-y-2">
          <p>⚠ {duplicateWarning}</p>
          <button
            type="button"
            disabled={isPending}
            onClick={() => submit(true)}
            className="btn-secondary text-xs disabled:opacity-50"
          >
            احفظ برضو (عيان مختلف)
          </button>
        </div>
      )}

      <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-50">
        {isPending ? "جاري الحفظ..." : "حفظ العيان"}
      </button>
    </form>
  );
}
