import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import Link from "next/link";
import CalendarGrid from "./CalendarGrid";

const MONTH_NAMES_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string };
}) {
  await requireProfile();
  const supabase = createClient();

  const now = new Date();
  const year = Number(searchParams?.year) || now.getFullYear();
  const month = Number(searchParams?.month) || now.getMonth() + 1;

  const rangeStart = new Date(year, month - 1, 1);
  const rangeEnd = new Date(year, month, 0, 23, 59, 59);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, appointment_date, status, patients(full_name)")
    .gte("appointment_date", rangeStart.toISOString())
    .lte("appointment_date", rangeEnd.toISOString());

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">تقويم المواعيد</h1>
        <Link href="/appointments" className="text-brand-600 text-sm hover:underline">
          عرض كقائمة
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/appointments/calendar?year=${prevYear}&month=${prevMonth}`}
          className="btn-secondary text-sm"
        >
          ← الشهر اللي فات
        </Link>
        <h2 className="font-bold text-lg">
          {MONTH_NAMES_AR[month - 1]} {year}
        </h2>
        <Link
          href={`/appointments/calendar?year=${nextYear}&month=${nextMonth}`}
          className="btn-secondary text-sm"
        >
          الشهر الجاي →
        </Link>
      </div>

      <div className="card">
        <CalendarGrid year={year} month={month} appointments={(appointments ?? []) as any} />
      </div>
    </div>
  );
}
