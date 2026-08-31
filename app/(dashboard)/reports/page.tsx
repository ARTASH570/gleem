import { createClient } from "@/lib/supabase/server";
import { requireDoctor } from "@/lib/auth";
import { addExpense } from "./actions";
import ExpenseRow from "./ExpenseRow";
import Link from "next/link";

function toDateParam(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildQuickRanges() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-11

  const monthStart = new Date(y, m, 1);
  const quarterStart = new Date(y, Math.floor(m / 3) * 3, 1);
  const halfStart = new Date(y, m < 6 ? 0 : 6, 1);
  const yearStart = new Date(y, 0, 1);

  return [
    { label: "الشهر ده", from: monthStart, to: today },
    { label: "الربع ده", from: quarterStart, to: today },
    { label: "نص السنة ده", from: halfStart, to: today },
    { label: "السنة دي", from: yearStart, to: today },
  ];
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  await requireDoctor();
  const supabase = createClient();

  const to = searchParams?.to ? new Date(searchParams.to) : new Date();
  const from = searchParams?.from
    ? new Date(searchParams.from)
    : new Date(new Date().setDate(to.getDate() - 30));

  const fromISO = from.toISOString();
  const toISO = new Date(to.getTime() + 86400000 - 1).toISOString();

  const [{ data: invoices }, { data: invTx }, { data: expenses }] = await Promise.all([
    supabase
      .from("invoices")
      .select("total_amount, paid_amount, created_at")
      .neq("status", "cancelled")
      .gte("created_at", fromISO)
      .lte("created_at", toISO),
    supabase
      .from("inventory_transactions")
      .select("change_qty, reason, created_at, inventory_items(unit_cost)")
      .in("reason", ["invoice", "cancellation"])
      .gte("created_at", fromISO)
      .lte("created_at", toISO),
    supabase
      .from("expenses")
      .select("id, title, amount, expense_date")
      .gte("expense_date", fromISO.slice(0, 10))
      .lte("expense_date", toISO.slice(0, 10))
      .order("expense_date", { ascending: false }),
  ]);

  const totalRevenue = (invoices ?? []).reduce((s, i) => s + Number(i.total_amount), 0);
  const totalCollected = (invoices ?? []).reduce((s, i) => s + Number(i.paid_amount), 0);

  // بنجمع حركات 'invoice' (استهلاك، change_qty سالب) و'cancellation' (إرجاع،
  // change_qty موجب) مع بعض، فلو فاتورة اتلغت في نفس الفترة بيبقى صافي
  // تكلفتها صفر بدل ما تتحسب استهلاك من غير إرجاعها
  const rawInventoryCost = (invTx ?? []).reduce((s, tx: any) => {
    const cost = Number(tx.inventory_items?.unit_cost ?? 0);
    // 'invoice' change_qty سالب (استهلاك) → بيزود التكلفة
    // 'cancellation' change_qty موجب (إرجاع) → بيقلل التكلفة
    return s - Number(tx.change_qty) * cost;
  }, 0);
  const inventoryCost = Math.max(0, rawInventoryCost);

  const totalExpenses = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const netProfit = totalCollected - inventoryCost - totalExpenses;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 dark:text-gray-100">الأرباح والتقارير</h1>

      <div className="flex gap-2 flex-wrap mb-4">
        {buildQuickRanges().map((r) => (
          <Link
            key={r.label}
            href={`/reports?from=${toDateParam(r.from)}&to=${toDateParam(r.to)}`}
            className="btn-secondary text-sm"
          >
            {r.label}
          </Link>
        ))}
      </div>

      <form className="flex gap-3 mb-6 items-end">
        <div>
          <label className="label">من</label>
          <input
            type="date"
            name="from"
            defaultValue={from.toISOString().slice(0, 10)}
            className="input-field"
          />
        </div>
        <div>
          <label className="label">إلى</label>
          <input
            type="date"
            name="to"
            defaultValue={to.toISOString().slice(0, 10)}
            className="input-field"
          />
        </div>
        <button className="btn-secondary">تحديث</button>
      </form>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-gray-500 dark:text-gray-400 text-sm">إجمالي الفواتير</p>
          <p className="text-2xl font-bold mt-2">{totalRevenue.toLocaleString()} ج.م</p>
        </div>
        <div className="card">
          <p className="text-gray-500 dark:text-gray-400 text-sm">المُحصّل فعليًا</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {totalCollected.toLocaleString()} ج.م
          </p>
        </div>
        <div className="card">
          <p className="text-gray-500 dark:text-gray-400 text-sm">تكلفة المخزون المستهلك</p>
          <p className="text-2xl font-bold text-orange-500 mt-2">
            {inventoryCost.toLocaleString()} ج.م
          </p>
        </div>
        <div className="card">
          <p className="text-gray-500 dark:text-gray-400 text-sm">المصاريف</p>
          <p className="text-2xl font-bold text-orange-500 mt-2">
            {totalExpenses.toLocaleString()} ج.م
          </p>
        </div>
      </div>

      <div className="card mb-8 border-brand-100">
        <p className="text-gray-500 dark:text-gray-400 text-sm">صافي الربح (المحصّل - تكلفة المخزون - المصاريف)</p>
        <p className={`text-3xl font-bold mt-2 ${netProfit >= 0 ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
          {netProfit.toLocaleString()} ج.م
        </p>
      </div>

      <div className="card">
        <h2 className="font-bold mb-3 dark:text-gray-100">المصاريف</h2>
        <form action={addExpense} className="flex gap-2 mb-4">
          <input name="title" placeholder="بيان المصروف" required className="input-field" />
          <input
            type="number"
            step="0.01"
            name="amount"
            placeholder="المبلغ"
            required
            className="input-field w-32"
          />
          <input type="date" name="expense_date" defaultValue={new Date().toISOString().slice(0, 10)} className="input-field" />
          <button className="btn-primary shrink-0">إضافة</button>
        </form>

        <table className="data-table">
          <thead>
            <tr>
              <th>البيان</th>
              <th>المبلغ</th>
              <th>التاريخ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(expenses ?? []).map((e) => (
              <ExpenseRow key={e.id} expense={e} />
            ))}
            {(!expenses || expenses.length === 0) && (
              <tr>
                <td colSpan={4} className="text-center text-gray-400 py-4">
                  مفيش مصاريف مسجلة في الفترة دي
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
