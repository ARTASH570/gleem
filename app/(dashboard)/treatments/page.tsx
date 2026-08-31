import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { createTreatment, removeUsageLink, deleteTreatment } from "./actions";
import { linkTreatmentUsage } from "../inventory/actions";

export default async function TreatmentsPage() {
  await requireProfile();
  const supabase = createClient();

  const [{ data: treatments }, { data: inventoryItems }, { data: usageLinks }] =
    await Promise.all([
      supabase.from("treatments").select("*").eq("is_active", true).order("name"),
      supabase.from("inventory_items").select("id, name, unit").eq("is_active", true).order("name"),
      supabase
        .from("treatment_inventory_usage")
        .select("id, treatment_id, quantity_used, inventory_items(name, unit)"),
    ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">الخدمات والأسعار</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-bold mb-3">قائمة الخدمات</h2>
          <table className="data-table mb-4">
            <thead>
              <tr>
                <th>الخدمة</th>
                <th>السعر الافتراضي</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(treatments ?? []).map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.name}</td>
                  <td>{Number(t.default_price).toLocaleString()} ج.م</td>
                  <td>
                    <form
                      action={async () => {
                        "use server";
                        await deleteTreatment(t.id);
                      }}
                    >
                      <button className="text-red-500 text-xs hover:underline">مسح</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <form action={createTreatment} className="flex gap-2">
            <input name="name" placeholder="اسم خدمة جديدة" required className="input-field" />
            <input
              type="number"
              step="0.01"
              name="default_price"
              placeholder="السعر"
              required
              className="input-field w-32"
            />
            <button className="btn-primary shrink-0">إضافة</button>
          </form>
        </div>

        <div className="card">
          <h2 className="font-bold mb-1">ربط الخدمة بالمخزن</h2>
          <p className="text-xs text-gray-500 mb-3">
            مثال: خدمة "حشو" بتستهلك 1 من صنف "حشو كومبوزيت" من المخزن. كل ما تتضاف الخدمة دي في
            فاتورة، هيتخصم تلقائي من المخزون.
          </p>

          <form action={linkTreatmentUsage} className="grid grid-cols-3 gap-2 mb-5">
            <select name="treatment_id" required className="input-field">
              <option value="">الخدمة</option>
              {(treatments ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select name="inventory_item_id" required className="input-field">
              <option value="">الصنف</option>
              {(inventoryItems ?? []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              <input
                type="number"
                step="0.01"
                name="quantity_used"
                defaultValue={1}
                className="input-field"
              />
              <button className="btn-primary shrink-0 text-xs px-2">ربط</button>
            </div>
          </form>

          <h3 className="text-sm font-semibold text-gray-600 mb-2">الروابط الحالية</h3>
          <ul className="text-sm space-y-1">
            {(usageLinks ?? []).map((u: any) => (
              <li key={u.id} className="flex justify-between items-center border-b border-gray-100 py-1">
                <span>
                  {treatments?.find((t) => t.id === u.treatment_id)?.name} ← {u.quantity_used}{" "}
                  {u.inventory_items?.unit} من {u.inventory_items?.name}
                </span>
                <form action={removeUsageLink.bind(null, u.id)}>
                  <button className="text-red-500 text-xs hover:underline">إلغاء</button>
                </form>
              </li>
            ))}
            {(!usageLinks || usageLinks.length === 0) && (
              <li className="text-gray-400 text-center py-3">مفيش روابط لسه</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
