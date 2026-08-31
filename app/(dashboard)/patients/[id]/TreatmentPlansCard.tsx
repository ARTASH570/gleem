"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createTreatmentPlan, updateTreatmentPlanStatus } from "../treatment-plan-actions";

type PlanInvoice = {
  id: string;
  invoice_number: number;
  total_amount: number;
  paid_amount: number;
  status: string;
};

type Plan = {
  id: string;
  title: string;
  notes: string | null;
  status: "active" | "completed" | "cancelled";
  created_at: string;
  invoices: PlanInvoice[];
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
  completed: "bg-green-50 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300",
};

const STATUS_LABELS: Record<string, string> = {
  active: "شغالة",
  completed: "خلصت",
  cancelled: "اتلغت",
};

export default function TreatmentPlansCard({ patientId, plans }: { patientId: string; plans: Plan[] }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!title.trim()) {
      setError("لازم تكتب عنوان لخطة العلاج");
      return;
    }
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("notes", notes);
      const result = await createTreatmentPlan(patientId, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setTitle("");
        setNotes("");
        setShowForm(false);
      }
    });
  }

  function handleStatusChange(planId: string, status: "completed" | "cancelled") {
    startTransition(() => {
      updateTreatmentPlanStatus(patientId, planId, status);
    });
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">خطط العلاج</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="text-sm text-brand-600 hover:underline"
        >
          {showForm ? "إلغاء" : "+ خطة جديدة"}
        </button>
      </div>

      {showForm && (
        <div className="border border-gray-100 dark:border-gray-800 rounded-lg p-3 mb-4 space-y-2">
          <input
            className="input-field"
            placeholder="عنوان الخطة (مثلاً: علاج عصب الضرس السفلي)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="input-field"
            placeholder="ملاحظات (اختياري)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending}
            className="btn-primary text-sm py-1.5 disabled:opacity-50"
          >
            {isPending ? "..." : "حفظ الخطة"}
          </button>
        </div>
      )}

      {plans.length === 0 && !showForm && (
        <p className="text-gray-400 text-sm text-center py-3">مفيش خطط علاج لسه</p>
      )}

      <div className="space-y-3">
        {plans.map((plan) => {
          const sessionsCount = plan.invoices?.length ?? 0;
          const totalAmount = (plan.invoices ?? []).reduce((s, i) => s + Number(i.total_amount), 0);
          const paidAmount = (plan.invoices ?? []).reduce((s, i) => s + Number(i.paid_amount), 0);

          return (
            <div key={plan.id} className="border border-gray-100 dark:border-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{plan.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${STATUS_STYLES[plan.status]}`}>
                  {STATUS_LABELS[plan.status] ?? plan.status}
                </span>
              </div>
              {plan.notes && <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{plan.notes}</p>}
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-2">
                {sessionsCount} جلسة · إجمالي {totalAmount.toLocaleString()} ج.م · محصّل{" "}
                {paidAmount.toLocaleString()} ج.م
              </p>

              {sessionsCount > 0 && (
                <ul className="mt-2 space-y-1">
                  {plan.invoices.map((inv) => (
                    <li key={inv.id} className="text-xs">
                      <Link href={`/invoices/${inv.id}`} className="text-brand-600 hover:underline">
                        فاتورة #{inv.invoice_number}
                      </Link>
                      <span className="text-gray-400"> — {Number(inv.paid_amount).toLocaleString()} ج.م</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center gap-3 mt-3">
                <Link
                  href={`/invoices/new?patient_id=${patientId}&treatment_plan_id=${plan.id}`}
                  className="text-xs text-brand-600 hover:underline"
                >
                  + فاتورة جديدة للخطة دي
                </Link>
                {plan.status === "active" && (
                  <>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleStatusChange(plan.id, "completed")}
                      className="text-xs text-green-600 hover:underline disabled:opacity-50"
                    >
                      علّم كخالصة
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleStatusChange(plan.id, "cancelled")}
                      className="text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      إلغاء الخطة
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
