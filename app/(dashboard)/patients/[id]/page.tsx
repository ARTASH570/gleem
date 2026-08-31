import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { updatePatient } from "../actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import DentalChart from "./DentalChart";
import TreatmentPlansCard from "./TreatmentPlansCard";

export default async function PatientProfilePage({ params }: { params: { id: string } }) {
  await requireProfile();
  const supabase = createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!patient) notFound();

  const [
    { data: invoices, count: invoicesCount },
    { data: appointments, count: appointmentsCount },
    { data: teeth },
    { data: treatmentPlans },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, paid_amount, status, created_at", { count: "exact" })
      .eq("patient_id", params.id)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("appointments")
      .select("id, appointment_date, status, notes", { count: "exact" })
      .eq("patient_id", params.id)
      .order("appointment_date", { ascending: false })
      .limit(15),
    supabase
      .from("patient_teeth")
      .select("tooth_number, status, notes")
      .eq("patient_id", params.id),
    supabase
      .from("treatment_plans")
      .select("id, title, notes, status, created_at, invoices(id, invoice_number, total_amount, paid_amount, status)")
      .eq("patient_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  const updateWithId = updatePatient.bind(null, params.id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div className="card">
          <h2 className="font-bold mb-4">بيانات العيان</h2>
          <form action={updateWithId} className="space-y-3">
            <div>
              <label className="label">الاسم بالكامل</label>
              <input name="full_name" defaultValue={patient.full_name} className="input-field" />
            </div>
            <div>
              <label className="label">التليفون</label>
              <input name="phone" defaultValue={patient.phone ?? ""} className="input-field" />
            </div>
            <div>
              <label className="label">الرقم القومي</label>
              <input
                name="national_id"
                defaultValue={patient.national_id ?? ""}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">تاريخ الميلاد</label>
              <input
                type="date"
                name="birth_date"
                defaultValue={patient.birth_date ?? ""}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">النوع</label>
              <select name="gender" defaultValue={patient.gender ?? ""} className="input-field">
                <option value="">اختر</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
            <div>
              <label className="label">العنوان</label>
              <input name="address" defaultValue={patient.address ?? ""} className="input-field" />
            </div>
            <div>
              <label className="label">ملاحظات طبية</label>
              <textarea
                name="medical_notes"
                defaultValue={patient.medical_notes ?? ""}
                rows={3}
                className="input-field"
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              حفظ التعديلات
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{patient.full_name}</h1>
          <Link href={`/invoices/new?patient_id=${patient.id}`} className="btn-primary">
            + فاتورة جديدة
          </Link>
        </div>

        <div className="card">
          <h2 className="font-bold mb-3">خريطة الأسنان</h2>
          <DentalChart patientId={patient.id} initialTeeth={teeth ?? []} />
        </div>

        <TreatmentPlansCard patientId={patient.id} plans={(treatmentPlans ?? []) as any} />

        <div className="card">
          <h2 className="font-bold mb-3">
            سجل الفواتير
            {(invoicesCount ?? 0) > 15 && (
              <span className="text-gray-400 font-normal text-xs"> (آخر 15 من {invoicesCount})</span>
            )}
          </h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم</th>
                <th>الإجمالي</th>
                <th>المدفوع</th>
                <th>الحالة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {(invoices ?? []).map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link href={`/invoices/${inv.id}`} className="text-brand-600 hover:underline">
                      #{inv.invoice_number}
                    </Link>
                  </td>
                  <td>{Number(inv.total_amount).toLocaleString()} ج.م</td>
                  <td>{Number(inv.paid_amount).toLocaleString()} ج.م</td>
                  <td>
                    <StatusBadge status={inv.status} />
                  </td>
                  <td>{new Date(inv.created_at).toLocaleDateString("ar-EG")}</td>
                </tr>
              ))}
              {(!invoices || invoices.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 py-4">
                    مفيش فواتير لسه
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="font-bold mb-3">
            سجل المواعيد
            {(appointmentsCount ?? 0) > 15 && (
              <span className="text-gray-400 font-normal text-xs"> (آخر 15 من {appointmentsCount})</span>
            )}
          </h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الحالة</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {(appointments ?? []).map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.appointment_date).toLocaleString("ar-EG")}</td>
                  <td>{appointmentStatusLabel(a.status)}</td>
                  <td>{a.notes || "-"}</td>
                </tr>
              ))}
              {(!appointments || appointments.length === 0) && (
                <tr>
                  <td colSpan={3} className="text-center text-gray-400 py-4">
                    مفيش مواعيد لسه
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "مدفوعة", cls: "bg-green-100 text-green-700" },
    partial: { label: "مدفوعة جزئيًا", cls: "bg-yellow-100 text-yellow-700" },
    unpaid: { label: "غير مدفوعة", cls: "bg-red-100 text-red-700" },
    cancelled: { label: "ملغاة", cls: "bg-gray-200 text-gray-500" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-700" };
  return <span className={`px-2 py-0.5 rounded-full text-xs ${s.cls}`}>{s.label}</span>;
}

function appointmentStatusLabel(status: string) {
  const map: Record<string, string> = {
    scheduled: "محجوز",
    completed: "تم",
    cancelled: "ملغي",
    no_show: "لم يحضر",
  };
  return map[status] ?? status;
}
