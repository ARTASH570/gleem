import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { toggleMaintenanceMode } from "./actions";
import { APP_VERSION } from "@/lib/version";

export default async function AdminPage() {
  await requireAdmin();
  const supabase = createClient();

  const { data: settings } = await supabase
    .from("app_settings")
    .select("last_backup_at, maintenance_mode")
    .eq("id", true)
    .single();

  const lastBackup = settings?.last_backup_at ? new Date(settings.last_backup_at) : null;
  const daysSinceBackup = lastBackup
    ? Math.floor((Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const needsBackup = !lastBackup || daysSinceBackup! >= 30;
  const maintenanceOn = settings?.maintenance_mode ?? false;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">لوحة الإدارة</h1>

      {needsBackup && (
        <div className="card border-red-200 bg-red-50 mb-6">
          <p className="text-red-700 font-medium">
            ⚠ {lastBackup
              ? `آخر نسخة احتياطية كانت من ${daysSinceBackup} يوم`
              : "لسه معملتش أي نسخة احتياطية"}
          </p>
          <p className="text-red-600 text-sm mt-1">
            ينصح بتحميل نسخة احتياطية شهريًا على الأقل عشان البيانات تكون محفوظة برة السيستم برضه.
          </p>
        </div>
      )}

      <div className="card mb-6">
        <h2 className="font-bold mb-2">نسخة احتياطية كاملة (Excel)</h2>
        <p className="text-sm text-gray-500 mb-4">
          هيتحمّل ملف Excel فيه كل حاجة: العيانين، الفواتير وبنودها، المخزن وحركته، المواعيد،
          المصاريف، والخدمات.
        </p>

        {lastBackup && (
          <p className="text-xs text-gray-400 mb-4">
            آخر تحميل: {lastBackup.toLocaleString("ar-EG")}
          </p>
        )}

        <a href="/api/export" className="btn-primary inline-block">
          ⬇️ تحميل نسخة Excel كاملة
        </a>
      </div>

      <div className="card mb-6">
        <h2 className="font-bold mb-2">وضع الصيانة</h2>
        <p className="text-sm text-gray-500 mb-4">
          لما تفعّله، السيستم بيتقفل مؤقتًا لأي حد غيرك (الدكتور والسكرتيرة هيشوفوا شاشة
          "تحت الصيانة" لحد ما تقفله تاني). استخدمه وانت بترفع تحديث عشان محدش يشتغل على
          بيانات ممكن تتغيّر تحتيه.
        </p>
        <form action={toggleMaintenanceMode.bind(null, maintenanceOn)}>
          <button
            className={maintenanceOn ? "btn-secondary" : "btn-primary"}
            type="submit"
          >
            {maintenanceOn ? "إيقاف وضع الصيانة" : "🔧 تفعيل وضع الصيانة"}
          </button>
        </form>
        {maintenanceOn && (
          <p className="text-red-600 text-sm mt-2">⚠ وضع الصيانة شغال دلوقتي</p>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">Gleem Clinic · إصدار {APP_VERSION}</p>
    </div>
  );
}
