import { createClient } from "@/lib/supabase/server";
import { requireDoctor } from "@/lib/auth";
import Pagination from "../_components/Pagination";

const ACTION_LABELS: Record<string, { label: string; cls: string }> = {
  create: { label: "إضافة", cls: "bg-green-100 text-green-700" },
  update: { label: "تعديل", cls: "bg-yellow-100 text-yellow-700" },
  delete: { label: "مسح", cls: "bg-red-100 text-red-700" },
};

const ENTITY_LABELS: Record<string, string> = {
  patient: "عيان",
  invoice: "فاتورة",
  inventory_item: "مخزون",
  treatment: "خدمة",
  appointment: "موعد",
  staff: "موظف",
  dental_chart: "خريطة أسنان",
};

const PAGE_SIZE = 50;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; action?: string; entity?: string; page?: string };
}) {
  await requireDoctor();
  const supabase = createClient();

  const { from, to, action, entity } = searchParams ?? {};
  const currentPage = Math.max(1, Number(searchParams?.page) || 1);
  const rangeFrom = (currentPage - 1) * PAGE_SIZE;
  const rangeTo = rangeFrom + PAGE_SIZE - 1;

  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", `${from}T00:00:00`);
  if (to) query = query.lte("created_at", `${to}T23:59:59`);
  if (action) query = query.eq("action", action);
  if (entity) query = query.eq("entity_type", entity);

  const { data: logs, count } = await query.range(rangeFrom, rangeTo);
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">سجل التعديلات</h1>

      <form className="card mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">من تاريخ</label>
          <input type="date" name="from" defaultValue={from} className="input-field" />
        </div>
        <div>
          <label className="label">لحد تاريخ</label>
          <input type="date" name="to" defaultValue={to} className="input-field" />
        </div>
        <div>
          <label className="label">نوع الإجراء</label>
          <select name="action" defaultValue={action ?? ""} className="input-field">
            <option value="">الكل</option>
            <option value="create">إضافة</option>
            <option value="update">تعديل</option>
            <option value="delete">مسح</option>
          </select>
        </div>
        <div>
          <label className="label">العنصر</label>
          <select name="entity" defaultValue={entity ?? ""} className="input-field">
            <option value="">الكل</option>
            {Object.entries(ENTITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary">فلترة</button>
        {(from || to || action || entity) && (
          <a href="/audit" className="btn-secondary">
            مسح الفلاتر
          </a>
        )}
      </form>

      <div className="card p-0 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>الوقت</th>
              <th>الموظف</th>
              <th>الإجراء</th>
              <th>النوع</th>
              <th>التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => {
              const actionInfo = ACTION_LABELS[log.action] ?? { label: log.action, cls: "bg-gray-100" };
              return (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-xs text-gray-400" data-label="الوقت">
                    {new Date(log.created_at).toLocaleString("ar-EG")}
                  </td>
                  <td data-label="الموظف">{log.actor_name}</td>
                  <td data-label="الإجراء">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${actionInfo.cls}`}>
                      {actionInfo.label}
                    </span>
                  </td>
                  <td className="text-xs text-gray-500" data-label="النوع">
                    {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
                  </td>
                  <td className="text-sm" data-label="التفاصيل">
                    {log.description}
                  </td>
                </tr>
              );
            })}
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-6">
                  مفيش تعديلات مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        basePath="/audit"
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        searchParams={{ from, to, action, entity }}
      />
    </div>
  );
}
