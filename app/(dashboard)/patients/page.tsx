import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import Link from "next/link";
import Pagination from "../_components/Pagination";

const PAGE_SIZE = 20;

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  await requireProfile();
  const supabase = createClient();
  const q = searchParams?.q?.trim();
  // بنشيل الحروف اللي ممكن تكسر أو تتلاعب في فلتر PostgREST (.or())
  // نفس المنطق المستخدم في صفحة البحث العام
  const qSafe = q ? q.replace(/[,()%_]/g, " ").trim() : "";
  const currentPage = Math.max(1, Number(searchParams?.page) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("patients")
    .select("id, full_name, phone, gender, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q && qSafe) {
    query = query.or(`full_name.ilike.%${qSafe}%,phone.ilike.%${qSafe}%`);
  }

  const { data: patients, count } = await query;
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">العيانين</h1>
        <Link href="/patients/new" className="btn-primary">
          + عيان جديد
        </Link>
      </div>

      <form className="mb-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="ابحث بالاسم أو رقم التليفون..."
          className="input-field max-w-sm"
        />
      </form>

      <div className="card p-0 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>التليفون</th>
              <th>النوع</th>
              <th>تاريخ التسجيل</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(patients ?? []).map((p) => (
              <tr key={p.id}>
                <td className="font-medium" data-label="الاسم">
                  {p.full_name}
                </td>
                <td data-label="التليفون">{p.phone || "-"}</td>
                <td data-label="النوع">
                  {p.gender === "male" ? "ذكر" : p.gender === "female" ? "أنثى" : "-"}
                </td>
                <td data-label="تاريخ التسجيل">{new Date(p.created_at).toLocaleDateString("ar-EG")}</td>
                <td>
                  <Link href={`/patients/${p.id}`} className="text-brand-600 hover:underline">
                    عرض البروفايل
                  </Link>
                </td>
              </tr>
            ))}
            {(!patients || patients.length === 0) && (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-6">
                  مفيش عيانين لسه
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        basePath="/patients"
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        searchParams={{ q }}
      />
    </div>
  );
}
