import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { createInventoryItem, restockItem, deleteInventoryItem } from "./actions";

export default async function InventoryPage() {
  await requireProfile();
  const supabase = createClient();

  const { data: items } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("is_active", true)
    .order("name");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">المخزن</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-0 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>الكمية المتاحة</th>
                  <th>الوحدة</th>
                  <th>الحد الأدنى</th>
                  <th>تكلفة الوحدة</th>
                  <th>توريد</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(items ?? []).map((item) => {
                  const low = Number(item.quantity) <= Number(item.min_quantity);
                  const restockWithId = restockItem.bind(null, item.id);
                  return (
                    <tr key={item.id} className={low ? "bg-red-50" : ""}>
                      <td className="font-medium">{item.name}</td>
                      <td className={low ? "text-red-600 font-bold" : ""}>{item.quantity}</td>
                      <td>{item.unit}</td>
                      <td>{item.min_quantity}</td>
                      <td>{Number(item.unit_cost).toLocaleString()} ج.م</td>
                      <td>
                        <form action={restockWithId} className="flex gap-1">
                          <input
                            type="number"
                            name="add_qty"
                            step="0.01"
                            placeholder="كمية"
                            className="input-field w-24 py-1"
                          />
                          <button className="btn-secondary py-1 text-xs">إضافة</button>
                        </form>
                      </td>
                      <td>
                        <form
                          action={async () => {
                            "use server";
                            await deleteInventoryItem(item.id);
                          }}
                        >
                          <button className="text-red-500 text-xs hover:underline">مسح</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
                {(!items || items.length === 0) && (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-400 py-6">
                      المخزن فاضي، ضيف أول صنف
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="card">
            <h2 className="font-bold mb-3">إضافة صنف جديد</h2>
            <form action={createInventoryItem} className="space-y-3">
              <div>
                <label className="label">اسم الصنف</label>
                <input name="name" required className="input-field" placeholder="مثال: حشو كومبوزيت" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">الوحدة</label>
                  <input name="unit" defaultValue="قطعة" className="input-field" />
                </div>
                <div>
                  <label className="label">الكمية الحالية</label>
                  <input type="number" step="0.01" name="quantity" defaultValue={0} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">حد التنبيه الأدنى</label>
                  <input type="number" step="0.01" name="min_quantity" defaultValue={0} className="input-field" />
                </div>
                <div>
                  <label className="label">تكلفة الوحدة (ج.م)</label>
                  <input type="number" step="0.01" name="unit_cost" defaultValue={0} className="input-field" />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">
                حفظ الصنف
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
