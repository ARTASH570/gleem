declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

import { createClient } from "@/lib/supabase/server"; import { requireProfile } from "@/lib/auth"; import { redirect } from "next/navigation"; import Link from "next/link"; import QueueRealtimeRefresher from "./QueueRealtimeRefresher"; import AddToQueueButton from "./AddToQueueButton"; import WalkInForm from "./WalkInForm"; import QueueEntryRow from "./QueueEntryRow";
export default async function QueuePage() { const profile = await requireProfile();
if (profile.role === "admin") { redirect("/admin"); }
const supabase = createClient();
const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0); const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
const [{ data: todayAppointments }, { data: activeEntries }, { data: doneEntries }, { data: patients }] = await Promise.all([ supabase .from("appointments") .select("id, appointment_date, patients(id, full_name)") .eq("status", "scheduled") .gte("appointment_date", todayStart.toISOString()) .lte("appointment_date", todayEnd.toISOString()) .order("appointment_date", { ascending: true }), supabase .from("queue_entries") .select("id, patient_id, appointment_id, status, started_at, created_at, patients(full_name, phone)") .in("status", ["waiting", "in_progress"]) .gte("created_at", todayStart.toISOString()) .order("created_at", { ascending: true }), supabase .from("queue_entries") .select("id, patient_id, status, completed_at, patients(full_name)") .eq("status", "done") .gte("created_at", todayStart.toISOString()) .order("completed_at", { ascending: false }) .limit(20), supabase.from("patients").select("id, full_name").order("full_name"), ]);
// العيانين اللي دخلوا الطابور بالفعل النهاردة (بأي حالة) عشان نشيلهم
// من قايمة "مواعيد النهاردة" اللي لسه محتاجة تتضاف
const { data: allTodayEntries } = await supabase
  .from("queue_entries")
  .select("appointment_id")
  .gte("created_at", todayStart.toISOString());

const queuedAppointmentIds = new Set<number | string>();
for (const entry of allTodayEntries ?? []) {
  if (entry?.appointment_id) {
    queuedAppointmentIds.add(entry.appointment_id);
  }
}

const pendingAppointments = (todayAppointments ?? []).filter((a: any) => !queuedAppointmentIds.has(a.id));
const waitingEntries = (activeEntries ?? []).filter((e) => e.status === "waiting"); const inProgressEntry = (activeEntries ?? []).find((e) => e.status === "in_progress") ?? null;
return ( <div> <QueueRealtimeRefresher /> <h1 className="text-2xl font-bold mb-6 dark:text-gray-100">🪑 إدارة الطابور</h1>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* عمود يمين: العيان الحالي + قايمة الانتظار */}
    <div className="space-y-4">
      <div className="card border-brand-200 dark:border-brand-500/30">
        <h2 className="font-bold mb-3 dark:text-gray-100">داخل الكشف دلوقتي</h2>
        {inProgressEntry ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-lg dark:text-gray-100">
                {(inProgressEntry as any).patients?.full_name}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                بدأ الساعة{" "}
                {inProgressEntry.started_at
                  ? new Date(inProgressEntry.started_at).toLocaleTimeString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </p>
            </div>
            <QueueEntryRow entryId={inProgressEntry.id} role={profile.role} status="in_progress" />
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">مفيش حد جوه الكشف دلوقتي</p>
        )}
      </div>

      <div className="card">
        <h2 className="font-bold mb-3 dark:text-gray-100">قايمة الانتظار ({waitingEntries.length})</h2>
        {waitingEntries.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">مفيش حد مستني دلوقتي</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {waitingEntries.map((entry: any, idx: number) => (
              <li key={entry.id} className="flex items-center justify-between py-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500 w-5">{idx + 1}</span>
                  <span className="dark:text-gray-200">{(entry as any).patients?.full_name}</span>
                </div>
                <QueueEntryRow
                  entryId={entry.id}
                  role={profile.role}
                  status="waiting"
                  canStart={!inProgressEntry}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>

    {/* عمود شمال: إضافة للطابور + مواعيد النهاردة + اللي خلصوا */}
    <div className="space-y-4">
      <div className="card">
        <h2 className="font-bold mb-3 dark:text-gray-100">إضافة عيان للطابور</h2>
        <WalkInForm patients={patients ?? []} />
      </div>

      <div className="card">
        <h2 className="font-bold mb-3 dark:text-gray-100">مواعيد النهاردة</h2>
        {pendingAppointments.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">مفيش مواعيد لسه محتاجة تتضاف</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {pendingAppointments.map((a: any) => (
              <li key={a.id} className="flex items-center justify-between py-2 gap-2">
                <div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                    {new Date(a.appointment_date).toLocaleTimeString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="dark:text-gray-200">{a.patients?.full_name}</span>
                </div>
                <AddToQueueButton patientId={a.patients?.id} appointmentId={a.id} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="font-bold mb-3 dark:text-gray-100">خلصوا النهاردة ({(doneEntries ?? []).length})</h2>
        {(doneEntries ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">لسه محدش خلص</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {(doneEntries ?? []).map((entry: any) => (
              <li key={entry.id} className="flex items-center justify-between py-2 gap-2">
                <span className="dark:text-gray-200">{entry.patients?.full_name}</span>
                <Link
                  href={`/invoices/new?patient_id=${entry.patient_id}`}
                  className="text-brand-600 dark:text-brand-400 text-xs hover:underline shrink-0"
                >
                  تسجيل الفاتورة 🧾
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
</div>
); }