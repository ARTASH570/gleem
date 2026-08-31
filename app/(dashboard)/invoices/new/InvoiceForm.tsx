"use client";

import { useMemo, useState } from "react";
import { createInvoiceAction } from "../actions";

type Treatment = { id: string; name: string; default_price: number };
type Patient = { id: string; full_name: string };
type TreatmentPlan = { id: string; title: string };

type LineItem = {
  treatment_id: string;
  description: string;
  quantity: number;
  unit_price: number;
};

export default function InvoiceForm({
  patients,
  treatments,
  defaultPatientId,
  defaultTreatmentPlanId,
  treatmentPlans,
  error,
}: {
  patients: Patient[];
  treatments: Treatment[];
  defaultPatientId?: string;
  defaultTreatmentPlanId?: string;
  treatmentPlans?: TreatmentPlan[];
  error?: string;
}) {
  const [patientId, setPatientId] = useState(defaultPatientId ?? "");
  const [treatmentPlanId, setTreatmentPlanId] = useState(defaultTreatmentPlanId ?? "");
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [newPatientNationalId, setNewPatientNationalId] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { treatment_id: "", description: "", quantity: 1, unit_price: 0 },
  ]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState("");

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
    [items]
  );

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function onTreatmentChange(index: number, treatmentId: string) {
    const t = treatments.find((t) => t.id === treatmentId);
    updateItem(index, {
      treatment_id: treatmentId,
      description: t?.name ?? "",
      unit_price: t?.default_price ?? 0,
    });
  }

  function addRow() {
    setItems((prev) => [...prev, { treatment_id: "", description: "", quantity: 1, unit_price: 0 }]);
  }

  function removeRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form action={createInvoiceAction} className="card space-y-5 max-w-3xl">
      <input type="hidden" name="patient_id" value={patientId} />
      <input type="hidden" name="treatment_plan_id" value={isNewPatient ? "" : treatmentPlanId} />
      <input type="hidden" name="is_new_patient" value={isNewPatient ? "1" : "0"} />
      <input type="hidden" name="items_json" value={JSON.stringify(items.filter((i) => i.description))} />

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">العيان *</label>
          <button
            type="button"
            onClick={() => {
              setIsNewPatient((v) => !v);
              setPatientId("");
            }}
            className="text-sm text-brand-600 hover:underline"
          >
            {isNewPatient ? "اختيار عيان مسجل" : "+ عيان جديد؟"}
          </button>
        </div>

        {isNewPatient ? (
          <div className="grid grid-cols-2 gap-2">
            <input
              name="new_patient_name"
              placeholder="اسم العيان *"
              required
              value={newPatientName}
              onChange={(e) => setNewPatientName(e.target.value)}
              className="input-field col-span-2"
            />
            <input
              name="new_patient_phone"
              placeholder="رقم التليفون"
              value={newPatientPhone}
              onChange={(e) => setNewPatientPhone(e.target.value)}
              className="input-field"
            />
            <input
              name="new_patient_national_id"
              placeholder="الرقم القومي (اختياري)"
              value={newPatientNationalId}
              onChange={(e) => setNewPatientNationalId(e.target.value)}
              className="input-field"
            />
            <p className="text-xs text-gray-400 col-span-2">
              هيتسجل العيان ده تلقائيًا في قائمة العيانين لما تحفظ الفاتورة.
            </p>
            <label className="col-span-2 flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" name="confirm_duplicate" value="1" />
              متأكد إنه عيان جديد (لو ظهرلك تنبيه تشابه أسامي قبل كده)
            </label>
          </div>
        ) : (
          <select
            required
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="input-field"
          >
            <option value="">اختر العيان</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {!isNewPatient && treatmentPlans && treatmentPlans.length > 0 && (
        <div>
          <label className="label">خطة العلاج (اختياري)</label>
          <select
            value={treatmentPlanId}
            onChange={(e) => setTreatmentPlanId(e.target.value)}
            className="input-field"
          >
            <option value="">مش مرتبطة بخطة</option>
            {treatmentPlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label mb-2">بنود الفاتورة</label>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <select
                className="input-field col-span-4"
                value={item.treatment_id}
                onChange={(e) => onTreatmentChange(index, e.target.value)}
              >
                <option value="">اختر خدمة (اختياري)</option>
                {treatments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <input
                className="input-field col-span-3"
                placeholder="الوصف"
                value={item.description}
                onChange={(e) => updateItem(index, { description: e.target.value })}
              />
              <input
                type="number"
                step="0.01"
                min={0}
                className="input-field col-span-2"
                placeholder="الكمية"
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
              />
              <input
                type="number"
                step="0.01"
                min={0}
                className="input-field col-span-2"
                placeholder="السعر"
                value={item.unit_price}
                onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) })}
              />
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="col-span-1 text-red-500 text-sm hover:underline"
              >
                حذف
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addRow} className="btn-secondary mt-3 text-sm">
          + إضافة بند
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <span className="text-gray-600">الإجمالي</span>
        <span className="text-xl font-bold text-brand-700">{total.toLocaleString()} ج.م</span>
      </div>

      <div>
        <label className="label">المبلغ المدفوع الآن</label>
        <input
          type="number"
          step="0.01"
          name="paid_amount"
          value={paidAmount}
          onChange={(e) => setPaidAmount(Number(e.target.value))}
          className="input-field"
        />
      </div>

      {paidAmount > 0 && (
        <div>
          <label className="label">طريقة الدفع</label>
          <select name="payment_method" defaultValue="cash" className="input-field">
            <option value="cash">نقدي</option>
            <option value="transfer">تحويل بنكي</option>
          </select>
        </div>
      )}

      <div>
        <label className="label">ملاحظات</label>
        <textarea
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="input-field"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button type="submit" className="btn-primary w-full">
        حفظ الفاتورة وخصم المخزون
      </button>
    </form>
  );
}
