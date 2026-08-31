"use client";

type Appointment = {
  id: string;
  appointment_date: string;
  status: string;
  patients?: { full_name: string } | null;
};

const WEEKDAYS_AR = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

const STATUS_DOT: Record<string, string> = {
  scheduled: "bg-brand-500",
  completed: "bg-green-500",
  cancelled: "bg-gray-400",
  no_show: "bg-red-500",
};

export default function CalendarGrid({
  year,
  month, // 1-12
  appointments,
}: {
  year: number;
  month: number;
  appointments: Appointment[];
}) {
  const firstOfMonth = new Date(year, month - 1, 1);
  // الأسبوع بيبدأ بالسبت (0 = الأحد في JS، فبنزود واحد ونعمل modulo 7)
  const startOffset = (firstOfMonth.getDay() + 1) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const apptsByDay = new Map<number, Appointment[]>();
  appointments.forEach((a) => {
    const d = new Date(a.appointment_date);
    if (d.getFullYear() === year && d.getMonth() === month - 1) {
      const day = d.getDate();
      if (!apptsByDay.has(day)) apptsByDay.set(day, []);
      apptsByDay.get(day)!.push(a);
    }
  });

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month - 1;

  return (
    <div className="grid grid-cols-7 gap-1 text-center">
      {WEEKDAYS_AR.map((d) => (
        <div key={d} className="text-xs font-semibold text-gray-500 pb-2">
          {d}
        </div>
      ))}
      {cells.map((day, i) => {
        const dayAppts = day ? apptsByDay.get(day) ?? [] : [];
        const isToday = isCurrentMonth && day === today.getDate();
        return (
          <div
            key={i}
            className={`min-h-[90px] rounded-lg border p-1 text-right ${
              day ? "bg-white border-gray-200" : "bg-transparent border-transparent"
            } ${isToday ? "ring-2 ring-brand-500" : ""}`}
          >
            {day && (
              <>
                <div className="text-xs text-gray-400 mb-1">{day}</div>
                <div className="space-y-0.5">
                  {dayAppts.slice(0, 3).map((a) => (
                    <div key={a.id} className="flex items-center gap-1 text-[10px] truncate">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[a.status] ?? "bg-gray-400"}`} />
                      <span className="truncate">{a.patients?.full_name}</span>
                    </div>
                  ))}
                  {dayAppts.length > 3 && (
                    <div className="text-[10px] text-gray-400">+{dayAppts.length - 3} كمان</div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
