import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import Link from "next/link";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  await requireProfile();
  const supabase = createClient();
  const q = searchParams?.q?.trim();

  let patients: any[] = [];
  let invoices: any[] = [];
  let appointments: any[] = [];

  // فلتر PostgREST (.or) بيستخدم الفاصلة والأقواس كرموز خاصة في بناء
  // الجملة نفسها، فلو كتب حد أي واحد منهم في مربع البحث ممكن يكسر
  // الفلتر أو يدي سلوك غير متوقع. بنشيلهم هنا قبل ما نستخدم q في
  // الفلترة (q الأصلي لسه بيتعرض في مربع البحث وبيتفحص كرقم فاتورة
  // زي ما هو من غير تغيير).
  const qSafe = q ? q.replace(/[,()%_]/g, " ").trim() : "";

  if (q && qSafe) {
    // الخطوة 1: نجيب العيانين المطابقين (على الاسم/التليفون/الرقم القومي) — ده
    // بقى سريع بفضل GIN trigram index بدل full table scan
    const patientsRes = await supabase
      .from("patients")
      .select("id, full_name, phone")
      .or(`full_name.ilike.%${qSafe}%,phone.ilike.%${qSafe}%,national_id.ilike.%${qSafe}%`)
      .limit(20);

    patients = patientsRes.data ?? [];
    const patientIds = patients.map((p) => p.id);

    // رقم الفاتورة عمود numeric (serial)، فبنستخدم eq بس لو q رقم صحيح
    const invoiceNumberFilter = /^\d+$/.test(q) ? `invoice_number.eq.${q}` : null;

    // الخطوة 2: نفلتر الفواتير والمواعيد في الـ SQL نفسه بدل ما نجيب 100 صف
    // ونفلتر في الكود — كده بنبحث في *كل* السجلات مش آخر 100 بس، وأسرع بكتير
    const [invoicesRes, appointmentsRes] = await Promise.all([
      patientIds.length > 0 || invoiceNumberFilter
        ? supabase
            .from("invoices")
            .select("id, invoice_number, total_amount, status, created_at, patients(full_name)")
            .or(
              [
                patientIds.length > 0 ? `patient_id.in.(${patientIds.join(",")})` : null,
                invoiceNumberFilter,
              ]
                .filter(Boolean)
                .join(",")
            )
            .order("created_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] as any[] }),
      patientIds.length > 0
        ? supabase
            .from("appointments")
            .select("id, appointment_date, status, patients(full_name)")
            .in("patient_id", patientIds)
            .order("appointment_date", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    invoices = invoicesRes.data ?? [];
    appointments = appointmentsRes.data ?? [];
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">بحث شامل</h1>

      <form className="mb-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="ابحث بالاسم، رقم التليفون، أو رقم الفاتورة..."
          className="input-field max-w-lg"
          autoFocus
        />
      </form>

      {!q && <p className="text-gray-400">اكتب أي حاجة فوق للبحث في العيانين والفواتير والمواعيد.</p>}

      {q && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="font-bold mb-3">العيانين ({patients.length})</h2>
            {patients.length === 0 ? (
              <p className="text-gray-400 text-sm">مفيش نتائج</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {patients.map((p) => (
                  <li key={p.id} className="border-b border-gray-100 py-2">
                    <Link href={`/patients/${p.id}`} className="text-brand-600 hover:underline">
                      {p.full_name}
                    </Link>
                    {p.phone && <span className="text-gray-400"> · {p.phone}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2 className="font-bold mb-3">الفواتير ({invoices.length})</h2>
            {invoices.length === 0 ? (
              <p className="text-gray-400 text-sm">مفيش نتائج</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {invoices.map((inv: any) => (
                  <li key={inv.id} className="border-b border-gray-100 py-2 flex justify-between">
                    <Link href={`/invoices/${inv.id}`} className="text-brand-600 hover:underline">
                      فاتورة #{inv.invoice_number} — {inv.patients?.full_name}
                    </Link>
                    <span className="text-gray-400">
                      {Number(inv.total_amount).toLocaleString()} ج.م
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2 className="font-bold mb-3">المواعيد ({appointments.length})</h2>
            {appointments.length === 0 ? (
              <p className="text-gray-400 text-sm">مفيش نتائج</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {appointments.map((a: any) => (
                  <li key={a.id} className="border-b border-gray-100 py-2 flex justify-between">
                    <span>{a.patients?.full_name}</span>
                    <span className="text-gray-400">
                      {new Date(a.appointment_date).toLocaleString("ar-EG")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
