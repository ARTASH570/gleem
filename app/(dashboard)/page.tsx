import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { dismissLowStockAlert } from "./actions";
import RevenueChart from "./RevenueChart";
import QueueBoard from "./QueueBoard";

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: "محجوز",
  completed: "تم",
  cancelled: "ملغي",
  no_show: "لم يحضر",
};

const APPOINTMENT_STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
  completed: "bg-green-50 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300",
  no_show: "bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
};

export default async function HomePage() {
  const profile = await requireProfile();

  // الأدمن مش محتاج داشبورد العيادة، دوره الوحيد النسخ الاحتياطي ووضع
  // الصيانة
  if (profile.role === "admin") {
    redirect("/admin");
  }

  const supabase = createClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [{ data: todayAppointmentsList }, { data: lowStock }, { count: patientsCount }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select("id, appointment_date, status, patients(full_name)")
        .gte("appointment_date", todayStart.toISOString())
        .lte("appointment_date", todayEnd.toISOString())
        .order("appointment_date", { ascending: true }),
      supabase
        .from("inventory_items")
        .select("id,name,quantity,min_quantity,low_stock_dismissed_until")
        .eq("is_active", true),
      supabase.from("patients").select("*", { count: "exact", head: true }),
    ]);

  const now = Date.now();
  const lowStockItems = (lowStock ?? []).filter((i) => {
    if (Number(i.quantity) > Number(i.min_quantity)) return false;
    if (!i.low_stock_dismissed_until) return true;
    return new Date(i.low_stock_dismissed_until).getTime() <= now;
  });

  const todayAppointments = todayAppointmentsList ?? [];

  let todayRevenue = 0;
  let needsBackup = false;
  let revenueByDay: { label: string; amount: number }[] = [];
  if (profile.role === "doctor") {
    const sevenDaysAgoStart = new Date();
    sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 6);
    sevenDaysAgoStart.setHours(0, 0, 0, 0);

    const [{ data: invoicesToday }, { data: settings }, { data: recentInvoices }] = await Promise.all([
      supabase
        .from("invoices")
        .select("paid_amount")
        .gte("created_at", todayStart.toISOString())
        .lte("created_at", todayEnd.toISOString()),
      supabase.from("app_settings").select("last_backup_at").eq("id", true).single(),
      supabase
        .from("invoices")
        .select("paid_amount, created_at")
        .gte("created_at", sevenDaysAgoStart.toISOString()),
    ]);
    todayRevenue = (invoicesToday ?? []).reduce((sum, inv) => sum + Number(inv.paid_amount), 0);

    const lastBackup = settings?.last_backup_at ? new Date(settings.last_backup_at) : null;
    const daysSince = lastBackup
      ? Math.floor((Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    needsBackup = !lastBackup || daysSince! >= 30;

    // بنجمع إيرادات آخر 7 أيام يوم بيوم عشان الرسم البياني في الداشبورد
    const buckets = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets.set(d.toDateString(), 0);
    }
    for (const inv of recentInvoices ?? []) {
      const key = new Date(inv.created_at).toDateString();
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + Number(inv.paid_amount));
      }
    }
    revenueByDay = Array.from(buckets.entries()).map(([key, amount]) => ({
      label: new Date(key).toLocaleDateString("ar-EG", { weekday: "short" }),
      amount,
    }));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 dark:text-gray-100">أهلاً، {profile.full_name} 👋</h1>

      {profile.role === "doctor" && needsBackup && (
        <div className="card border-red-200 bg-red-50 mb-6 dark:bg-red-900/20 dark:border-red-900/50">
          <p className="text-red-700 font-medium text-sm dark:text-red-300">
            ⚠ لسه معملتش نسخة احتياطية Excel من شهر. النسخ الاحتياطي بقى مسؤولية الأدمن —
            ذكّره لو محتاجة تتعمل.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-gray-500 text-sm dark:text-gray-400">عدد العيانين</p>
          <p className="text-3xl font-bold text-brand-700 dark:text-brand-400 mt-2">{patientsCount ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-gray-500 text-sm dark:text-gray-400">مواعيد النهاردة</p>
          <p className="text-3xl font-bold text-brand-700 dark:text-brand-400 mt-2">{todayAppointments.length}</p>
        </div>
        {profile.role === "doctor" && (
          <div className="card">
            <p className="text-gray-500 text-sm dark:text-gray-400">تحصيل النهاردة</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
              {todayRevenue.toLocaleString()} ج.م
            </p>
          </div>
        )}
        <div className="card">
          <p className="text-gray-500 text-sm dark:text-gray-400">أصناف قربت تخلص</p>
          <p className="text-3xl font-bold text-red-500 dark:text-red-400 mt-2">{lowStockItems.length}</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link href="/invoices/new" className="btn-primary">
          + فاتورة جديدة
        </Link>
        <Link href="/patients/new" className="btn-secondary">
          + عيان جديد
        </Link>
        <Link href="/appointments" className="btn-secondary">
          مواعيد النهاردة
        </Link>
      </div>

      <div className="mt-6">
        <QueueBoard role={profile.role} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold dark:text-gray-100">📅 مواعيد النهاردة</h2>
            <Link href="/appointments" className="text-brand-600 dark:text-brand-400 text-xs hover:underline">
              عرض الكل
            </Link>
          </div>
          {todayAppointments.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">مفيش مواعيد النهاردة</p>
          ) : (
            <ul className="text-sm divide-y divide-gray-100 dark:divide-gray-700">
              {todayAppointments.slice(0, 6).map((a: any) => (
                <li key={a.id} className="flex items-center justify-between py-2 gap-2">
                  <span className="text-gray-400 dark:text-gray-500 text-xs shrink-0 w-14">
                    {new Date(a.appointment_date).toLocaleTimeString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="flex-1 truncate dark:text-gray-200">
                    {a.patients?.full_name ?? "—"}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      APPOINTMENT_STATUS_STYLES[a.status] ?? "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {APPOINTMENT_STATUS_LABELS[a.status] ?? a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {todayAppointments.length > 6 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              و{todayAppointments.length - 6} موعد تاني...
            </p>
          )}
        </div>

        {lowStockItems.length > 0 && (
          <div className="card border-red-200 dark:border-red-900/50">
            <h2 className="font-bold text-red-600 dark:text-red-400 mb-3">⚠ أصناف قربت تخلص من المخزن</h2>
            <ul className="text-sm space-y-1">
              {lowStockItems.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between items-center gap-2 border-b border-gray-100 dark:border-gray-700 py-1"
                >
                  <span className="dark:text-gray-200">{item.name}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-red-500 dark:text-red-400">متبقي: {item.quantity}</span>
                    <form action={dismissLowStockAlert.bind(null, item.id)}>
                      <button
                        className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                        title="إخفاء التنبيه ده ليوم واحد"
                      >
                        تجاهل ✕
                      </button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {profile.role === "doctor" && (
        <div className="card mt-6">
          <h2 className="font-bold mb-4 dark:text-gray-100">📈 إيرادات آخر 7 أيام</h2>
          <RevenueChart data={revenueByDay} />
        </div>
      )}
    </div>
  );
}
