import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { updatePaymentAction } from "../actions";
import { notFound } from "next/navigation";
import InvoiceActions from "./InvoiceActions";
import CancelInvoiceButton from "./CancelInvoiceButton";

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { error?: string };
}) {
  const profile = await requireProfile();
  const supabase = createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, patients(full_name, phone)")
    .eq("id", params.id)
    .single();

  if (!invoice) notFound();

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", params.id);

  const { data: paymentsHistory } = await supabase
    .from("payments")
    .select("id, amount, method, created_at")
    .eq("invoice_id", params.id)
    .order("created_at", { ascending: true });

  const remaining = Number(invoice.total_amount) - Number(invoice.paid_amount);
  const updateWithId = updatePaymentAction.bind(null, params.id);

  return (
    <div className="max-w-2xl">
      <div className="flex justify-between items-center mb-3 print:hidden">
        {profile.role === "doctor" && invoice.status !== "cancelled" ? (
          <CancelInvoiceButton invoiceId={params.id} />
        ) : (
          <span />
        )}
        <InvoiceActions invoiceNumber={invoice.invoice_number} />
      </div>

      <div id="invoice-print-area" className="card">
        <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            {/* لما تحط اللوجو في public/logo.png هيظهر هنا تلقائيًا.
                لغاية ما تحطه، السطر ده مش هيبين حاجة عادي */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Gleem Clinic"
              className="h-14 w-14 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <h1 className="text-xl font-bold">Gleem Clinic</h1>
              <p className="text-xs text-gray-400">جليم كلينك لطب الأسنان</p>
            </div>
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold">فاتورة #{invoice.invoice_number}</h2>
            <p className="text-gray-500 text-sm mt-1">
              {new Date(invoice.created_at).toLocaleString("ar-EG")}
            </p>
            <div className="mt-2">
              <StatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-500">العيان</p>
          <p className="font-medium text-lg">{invoice.patients?.full_name}</p>
          {invoice.patients?.phone && <p className="text-sm text-gray-500">{invoice.patients.phone}</p>}
        </div>

        <table className="data-table mb-4">
          <thead>
            <tr>
              <th>البند</th>
              <th>الكمية</th>
              <th>السعر</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td>{item.quantity}</td>
                <td>{Number(item.unit_price).toLocaleString()} ج.م</td>
                <td>{Number(item.total_price).toLocaleString()} ج.م</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-1 text-sm border-t border-gray-100 dark:border-gray-700 pt-3">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">الإجمالي</span>
            <span className="font-bold dark:text-gray-100">{Number(invoice.total_amount).toLocaleString()} ج.م</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">المدفوع</span>
            <span className="dark:text-gray-200">{Number(invoice.paid_amount).toLocaleString()} ج.م</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">المتبقي</span>
            <span className={remaining > 0 ? "text-red-600 dark:text-red-400 font-bold" : "dark:text-gray-200"}>
              {remaining.toLocaleString()} ج.م
            </span>
          </div>
        </div>

        {paymentsHistory && paymentsHistory.length > 0 && (
          <div className="text-sm border-t border-gray-100 dark:border-gray-700 pt-3 mt-3">
            <p className="text-gray-500 dark:text-gray-400 mb-1">تاريخ الدفعات</p>
            <ul className="space-y-1">
              {paymentsHistory.map((p) => (
                <li key={p.id} className="flex justify-between dark:text-gray-200">
                  <span>
                    {new Date(p.created_at).toLocaleDateString("ar-EG")} —{" "}
                    {p.method === "transfer" ? "تحويل بنكي" : "نقدي"}
                  </span>
                  <span>{Number(p.amount).toLocaleString()} ج.م</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {invoice.notes && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
            ملاحظات: {invoice.notes}
          </p>
        )}

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6 border-t border-gray-100 dark:border-gray-700 pt-4">
          شكرًا لزيارتكم Gleem Clinic 🦷
        </p>
      </div>

      {searchParams?.error && (
        <p className="text-red-600 dark:text-red-400 text-sm mt-4 print:hidden">{searchParams.error}</p>
      )}

      {remaining > 0 && invoice.status !== "cancelled" && (
        <form action={updateWithId} className="flex flex-wrap gap-2 mt-4 print:hidden">
          <input
            type="number"
            step="0.01"
            name="add_payment"
            placeholder="مبلغ جديد يتحصّل"
            className="input-field flex-1 min-w-[140px]"
            max={remaining}
          />
          <select name="payment_method" defaultValue="cash" className="input-field w-32">
            <option value="cash">نقدي</option>
            <option value="transfer">تحويل</option>
          </select>
          <button className="btn-primary shrink-0">تحصيل دفعة</button>
        </form>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "مدفوعة", cls: "bg-green-100 text-green-700" },
    partial: { label: "مدفوعة جزئيًا", cls: "bg-yellow-100 text-yellow-700" },
    unpaid: { label: "غير مدفوعة", cls: "bg-red-100 text-red-700" },
    cancelled: { label: "ملغاة", cls: "bg-gray-200 text-gray-500" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-700" };
  return <span className={`px-3 py-1 rounded-full text-sm ${s.cls}`}>{s.label}</span>;
}
