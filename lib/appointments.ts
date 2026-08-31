import { createClient } from "@/lib/supabase/server";

type SupabaseClient = ReturnType<typeof createClient>;

// بيدور على أي موعد (غير ملغي) بيتقاطع مع النطاق الزمني المُدخل.
// العيادة فيها دكتور واحد بس، فأي تعارض وقت بيعتبر تعارض حجيقي بغض
// النظر عن مين اللي حجزه.
export async function findConflictingAppointment(
  supabase: SupabaseClient,
  startIso: string,
  durationMinutes: number,
  excludeAppointmentId?: string
) {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  // بنوسع نطاق البحث بـ 4 ساعات قبل وبعد عشان نتأكد نغطي أي موعد
  // طويل ممكن يبدأ قبل النطاق ده ويمتد جواه
  const searchStart = new Date(start.getTime() - 4 * 60 * 60000).toISOString();
  const searchEnd = new Date(end.getTime() + 4 * 60 * 60000).toISOString();

  let query = supabase
    .from("appointments")
    .select("id, appointment_date, duration_minutes, patients(full_name)")
    .neq("status", "cancelled")
    .gte("appointment_date", searchStart)
    .lte("appointment_date", searchEnd);

  if (excludeAppointmentId) {
    query = query.neq("id", excludeAppointmentId);
  }

  const { data } = await query;

  return (data ?? []).find((a: any) => {
    const aStart = new Date(a.appointment_date);
    const aEnd = new Date(aStart.getTime() + (a.duration_minutes ?? 30) * 60000);
    return aStart < end && aEnd > start;
  }) as
    | { id: string; appointment_date: string; duration_minutes: number; patients: { full_name: string } | null }
    | undefined;
}
