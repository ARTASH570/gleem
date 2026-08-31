import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import Link from "next/link";
import NewAppointmentForm from "./NewAppointmentForm";
import AppointmentRow from "./AppointmentRow";

export default async function AppointmentsPage() {
  await requireProfile();
  const supabase = createClient();

  const [{ data: appointments }, { data: patients }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, appointment_date, duration_minutes, status, notes, patients(full_name, phone)")
      .order("appointment_date", { ascending: true })
      .gte("appointment_date", new Date(Date.now() - 86400000).toISOString())
      .limit(100),
    supabase.from("patients").select("id, full_name").order("full_name"),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">المواعيد القادمة</h1>
          <Link href="/appointments/calendar" className="text-brand-600 text-sm hover:underline">
            عرض تقويمي 📅
          </Link>
        </div>
        <div className="card p-0 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>التاريخ والوقت</th>
                <th>العيان</th>
                <th>ملاحظات</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(appointments ?? []).map((a: any) => (
                <AppointmentRow key={a.id} appointment={a} />
              ))}
              {(!appointments || appointments.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 py-6">
                    مفيش مواعيد قادمة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="card">
          <h2 className="font-bold mb-3">حجز موعد جديد</h2>
          <NewAppointmentForm patients={patients ?? []} />
        </div>
      </div>
    </div>
  );
}
