import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import Link from "next/link";
import Pagination from "../_components/Pagination";

const PAGE_SIZE = 20;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  await requireProfile();
  const supabase = createClient();
  const currentPage = Math.max(1, Number(searchParams?.page) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: invoices, count } = await supabase
    .from("invoices")
    .select("id, invoice_number, total_amount, paid_amount, status, created_at, patients(full_name)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">الفواتير</h1>
        <Link href="/invoices/new" className="btn-primary">
          + فاتورة جديدة
        </Link>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>رقم</th>
              <th>العيان</th>
              <th>الإجمالي</th>
              <th>المدفوع</th>
              <th>الحالة</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {(invoices ?? []).map((inv: any) => (
              <tr key={inv.id}>
                <td data-label="رقم">
                  <Link href={`/invoices/${inv.id}`} className="text-brand-600 hover:underline">
                    #{inv.invoice_number}
                  </Link>
                </td>
                <td data-label="العيان">{inv.patients?.full_name}</td>
                <td data-label="الإجمالي">{Number(inv.total_amount).toLocaleString()} ج.م</td>
                <td data-label="المدفوع">{Number(inv.paid_amount).toLocaleString()} ج.م</td>
                <td data-label="الحالة">
                  <StatusBadge status={inv.status} />
                </td>
                <td data-label="التاريخ">{new Date(inv.created_at).toLocaleDateString("ar-EG")}</td>
              </tr>
            ))}
            {(!invoices || invoices.length === 0) && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-6">
                  مفيش فواتير لسه
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        basePath="/invoices"
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
      />
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
  return <span className={`px-2 py-0.5 rounded-full text-xs ${s.cls}`}>{s.label}</span>;
}
