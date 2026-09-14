import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import Link from "next/link";
import Pagination from "../_components/Pagination";

const PAGE_SIZE = 20;

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; sort?: string };
}) {
  await requireProfile();
  const supabase = createClient();
  const q = searchParams?.q?.trim();
  const sort = searchParams?.sort === "name" ? "name" : "recent";
  const currentPage = Math.max(1, Number(searchParams?.page) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("patients")
    .select("id, full_name, phone, gender, created_at", { count: "exact" })
    .order(sort === "name" ? "full_name" : "created_at", {
      ascending: sort === "name",
    })
    .range(from, to);

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
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

      <div className="flex items-center gap-2 mb-4 text-sm">
        <span className="text-gray-500">ترتيب حسب:</span>
        <Link
          href={`/patients?${new URLSearchParams({ ...(q ? { q } : {}), sort: "recent" }).toString()}`}
          className={`px-3 py-1 rounded-full ${
            sort === "recent"
              ? "bg-brand-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          }`}
        >
          الأحدث
        </Link>
        <Link
          href={`/patients?${new URLSearchParams({ ...(q ? { q } : {}), sort: "name" }).toString()}`}
          className={`px-3 py-1 rounded-full ${
            sort === "name"
              ? "bg-brand-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          }`}
        >
          أبجدي (أ-ي)
        </Link>
      </div>

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
        searchParams={{ q, sort }}
      />
    </div>
  );
}
