import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import PollRefresher from "./queue/PollRefresher";
import AddToQueueButton from "./queue/AddToQueueButton";
import WalkInForm from "./queue/WalkInForm";
import QueueEntryRow from "./queue/QueueEntryRow";

// كارت الطابور اللي بيظهر في الهوم اسكرين بدل ما يكون له صفحة لوحده.
// المنطق والاستعلامات نفسها بالظبط اللي كانت في app/(dashboard)/queue/page.tsx
// (قبل ما ننقلها هنا)، بس العرض بقى مكثف أكتر ومقسّم أقسام قابلة للطي
// (details/summary) عشان الكارت يفضل واضح ومرتب حتى لو الطابور مزدحم.
export default async function QueueBoard({ role }: { role: string }) {
  const supabase = createClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [{ data: todayAppointments }, { data: activeEntries }, { data: doneEntries }, { data: patients }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select("id, appointment_date, patients(id, full_name)")
        .eq("status", "scheduled")
        .gte("appointment_date", todayStart.toISOString())
        .lte("appointment_date", todayEnd.toISOString())
        .order("appointment_date", { ascending: true }),
      supabase
        .from("queue_entries")
        .select("id, patient_id, appointment_id, status, started_at, created_at, patients(full_name, phone)")
        .in("status", ["waiting", "in_progress"])
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: true }),
      supabase
        .from("queue_entries")
        .select("id, patient_id, status, completed_at, patients(full_name)")
        .eq("status", "done")
        .gte("created_at", todayStart.toISOString())
        .order("completed_at", { ascending: false })
        .limit(8),
      supabase.from("patients").select("id, full_name").order("full_name"),
    ]);

  const { data: allTodayEntries } = await supabase
    .from("queue_entries")
    .select("appointment_id")
    .gte("created_at", todayStart.toISOString());
  const queuedAppointmentIds = new Set((allTodayEntries ?? []).map((e) => e.appointment_id).filter(Boolean));
  const pendingAppointments = (todayAppointments ?? []).filter((a) => !queuedAppointmentIds.has(a.id));

  const waitingEntries = (activeEntries ?? []).filter((e) => e.status === "waiting");
  const inProgressEntry = (activeEntries ?? []).find((e) => e.status === "in_progress") ?? null;

  return (
    <div className="card">
      <PollRefresher />
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg dark:text-gray-100">🪑 الطابور</h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">{waitingEntries.length} مستني</span>
      </div>

      {/* داخل الكشف دلوقتي */}
      <div className="rounded-lg border border-brand-200 dark:border-brand-500/30 bg-brand-50/40 dark:bg-brand-500/10 px-3 py-2 mb-3">
        {inProgressEntry ? (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">داخل الكشف دلوقتي</p>
              <p className="font-medium dark:text-gray-100 truncate">
                {(inProgressEntry as any).patients?.full_name}
              </p>
            </div>
            <QueueEntryRow entryId={inProgressEntry.id} role={role} status="in_progress" />
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">مفيش حد جوه الكشف دلوقتي</p>
        )}
      </div>

      {/* قايمة الانتظار */}
      {waitingEntries.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">مفيش حد مستني دلوقتي</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700 mb-3 max-h-56 overflow-y-auto">
          {waitingEntries.map((entry, idx) => (
            <li key={entry.id} className="flex items-center justify-between py-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-gray-400 dark:text-gray-500 w-5 shrink-0">{idx + 1}</span>
                <span className="dark:text-gray-200 truncate">{(entry as any).patients?.full_name}</span>
              </div>
              <QueueEntryRow entryId={entry.id} role={role} status="waiting" canStart={!inProgressEntry} />
            </li>
          ))}
        </ul>
      )}

      {/* خلصوا النهاردة - قابل للطي عشان مايكبرش الكارت من غير داعي */}
      {(doneEntries ?? []).length > 0 && (
        <details className="mb-3">
          <summary className="text-xs text-gray-400 dark:text-gray-500 cursor-pointer select-none">
            ✓ خلصوا النهاردة ({(doneEntries ?? []).length})
          </summary>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700 mt-2">
            {(doneEntries ?? []).map((entry: any) => (
              <li key={entry.id} className="flex items-center justify-between py-1.5 gap-2">
                <span className="text-sm dark:text-gray-200 truncate">{entry.patients?.full_name}</span>
                <Link
                  href={`/invoices/new?patient_id=${entry.patient_id}`}
                  className="text-brand-600 dark:text-brand-400 text-xs hover:underline shrink-0"
                >
                  تسجيل الفاتورة 🧾
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* إضافة للطابور - قابل للطي برضه */}
      <details>
        <summary className="text-sm text-brand-600 dark:text-brand-400 cursor-pointer select-none">
          + إضافة عيان للطابور
        </summary>
        <div className="mt-3 space-y-3">
          {pendingAppointments.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">من مواعيد النهاردة</p>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {pendingAppointments.map((a: any) => (
                  <li key={a.id} className="flex items-center justify-between py-1.5 gap-2">
                    <div className="min-w-0">
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                        {new Date(a.appointment_date).toLocaleTimeString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="dark:text-gray-200 truncate">{a.patients?.full_name}</span>
                    </div>
                    <AddToQueueButton patientId={a.patients?.id} appointmentId={a.id} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">زيارة مباشرة (walk-in)</p>
            <WalkInForm patients={patients ?? []} />
          </div>
        </div>
      </details>
    </div>
  );
}
