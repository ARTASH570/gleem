import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { APP_VERSION } from "@/lib/version";
import ThemeToggle from "./ThemeToggle";
import NotificationsBell from "./NotificationsBell";

// بيمنع الكاش على كل صفحات لوحة التحكم، عشان أي تعديل (زي خصم من
// المخزن أو فاتورة جديدة) يظهر فورًا من غير ما تحتاج تعمل refresh يدوي
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ROLE_LABELS: Record<string, string> = {
  doctor: "دكتور",
  secretary: "سكرتيرة",
  admin: "أدمن",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const supabase = createClient();

  const { data: settings } = await supabase
    .from("app_settings")
    .select("maintenance_mode")
    .eq("id", true)
    .single();

  // وضع الصيانة: أي حد غير الأدمن بيشوف شاشة الصيانة بس، من غير أي
  // وصول للسيستم لحد ما الأدمن يقفله
  if (settings?.maintenance_mode && profile.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🔧</p>
          <h1 className="text-xl font-bold mb-2 dark:text-gray-100">السيستم تحت الصيانة</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            بنعمل تحديث دلوقتي. هيرجع شغال تاني قريب — حاول تاني بعد شوية.
          </p>
        </div>
      </div>
    );
  }

  const links = [{ href: "/", label: "الرئيسية", icon: "🏠" }];

  // عدادات التنبيهات في الجرس أعلى الصفحة - مش محتاجة للأدمن (دوره
  // بس النسخ الاحتياطي ووضع الصيانة)
  let notificationCounts = { todayAppointmentsCount: 0, lowStockCount: 0, overdueInvoicesCount: 0 };
  if (profile.role !== "admin") {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [{ count: todayAppointmentsCount }, { data: lowStock }, { count: overdueInvoicesCount }] =
      await Promise.all([
        supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("status", "scheduled")
          .gte("appointment_date", todayStart.toISOString())
          .lte("appointment_date", todayEnd.toISOString()),
        supabase
          .from("inventory_items")
          .select("quantity, min_quantity, low_stock_dismissed_until")
          .eq("is_active", true),
        supabase.from("invoices").select("*", { count: "exact", head: true }).in("status", ["unpaid", "partial"]),
      ]);

    const now = Date.now();
    const lowStockCount = (lowStock ?? []).filter((i) => {
      if (Number(i.quantity) > Number(i.min_quantity)) return false;
      if (!i.low_stock_dismissed_until) return true;
      return new Date(i.low_stock_dismissed_until).getTime() <= now;
    }).length;

    notificationCounts = {
      todayAppointmentsCount: todayAppointmentsCount ?? 0,
      lowStockCount,
      overdueInvoicesCount: overdueInvoicesCount ?? 0,
    };
  }

  if (profile.role !== "admin") {
    links.push(
      { href: "/search", label: "بحث شامل", icon: "🔍" },
      { href: "/patients", label: "العيانين", icon: "🧑‍⚕️" },
      { href: "/appointments", label: "المواعيد", icon: "📅" },
      { href: "/invoices", label: "الفواتير", icon: "🧾" },
      { href: "/inventory", label: "المخزن", icon: "📦" },
      { href: "/treatments", label: "الخدمات والأسعار", icon: "🦷" }
    );
  }

  if (profile.role === "doctor") {
    links.push(
      { href: "/reports", label: "الأرباح والتقارير", icon: "📊" },
      { href: "/staff", label: "الموظفين", icon: "👥" },
      { href: "/audit", label: "سجل التعديلات", icon: "📋" }
    );
  }

  if (profile.role === "admin") {
    links.push({ href: "/admin", label: "لوحة الإدارة", icon: "🛠️" });
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-brand-700 text-white flex flex-col shrink-0 print:hidden">
        <div className="p-5 border-b border-white/10">
          <h1 className="font-bold text-lg">Gleem Clinic</h1>
          <p className="text-[11px] text-white/60 mt-0.5">جليم كلينك لطب الأسنان</p>
          <p className="text-xs text-white/70 mt-1">
            {profile.full_name} · {ROLE_LABELS[profile.role] ?? profile.role}
          </p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-sm"
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <ThemeToggle />
        </div>
        <form action={logout} className="p-3 border-t border-white/10">
          <button className="w-full text-sm text-right text-white/80 hover:text-white px-3 py-2">
            تسجيل الخروج ↩
          </button>
        </form>
        <p className="text-center text-[10px] text-white/30 pb-2">v{APP_VERSION}</p>
      </aside>
      <main className="flex-1 bg-gray-50 dark:bg-gray-900 min-h-screen print:bg-white">
        {profile.role !== "admin" && (
          <div className="flex items-center justify-end px-6 py-2 border-b border-gray-200 dark:border-gray-800 print:hidden">
            <NotificationsBell {...notificationCounts} />
          </div>
        )}
        <div className="p-6 print:p-0">{children}</div>
      </main>
    </div>
  );
}
