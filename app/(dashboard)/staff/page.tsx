import { createClient } from "@/lib/supabase/server";
import { requireDoctor } from "@/lib/auth";
import { createStaffAccount, toggleStaffActive } from "./actions";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireDoctor();
  const supabase = createClient();

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone, is_active")
    .neq("role", "admin")
    .order("created_at");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h1 className="text-2xl font-bold mb-6">الموظفين</h1>
        <div className="card p-0 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الدور</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(staff ?? []).map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.full_name}</td>
                  <td>{s.role === "doctor" ? "دكتور" : "سكرتيرة"}</td>
                  <td>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {s.is_active ? "فعّال" : "موقوف"}
                    </span>
                  </td>
                  <td>
                    <form action={toggleStaffActive.bind(null, s.id, s.is_active)}>
                      <button className="text-brand-600 text-xs hover:underline">
                        {s.is_active ? "إيقاف" : "تفعيل"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="card">
          <h2 className="font-bold mb-3">إضافة موظف جديد</h2>
          <form action={createStaffAccount} className="space-y-3">
            <div>
              <label className="label">الاسم بالكامل</label>
              <input name="full_name" required className="input-field" />
            </div>
            <div>
              <label className="label">البريد الإلكتروني (هيستخدمه للدخول)</label>
              <input type="email" name="email" required className="input-field" />
            </div>
            <div>
              <label className="label">كلمة المرور المبدئية</label>
              <input type="text" name="password" required minLength={8} className="input-field" />
              <p className="text-xs text-gray-400 mt-1">8 حروف على الأقل، وتحتوي على حروف وأرقام</p>
            </div>
            <div>
              <label className="label">الدور</label>
              <select name="role" className="input-field">
                <option value="secretary">سكرتيرة</option>
                <option value="doctor">دكتور</option>
              </select>
            </div>
            {searchParams?.error && <p className="text-red-600 text-sm">{searchParams.error}</p>}
            <button className="btn-primary w-full">إنشاء الحساب</button>
          </form>
        </div>
      </div>
    </div>
  );
}
