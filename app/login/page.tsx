import { login } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4">
      <div className="card w-full max-w-sm">
        <h1 className="text-xl font-bold text-brand-700 mb-1 text-center">
          نظام إدارة العيادة
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">سجّل الدخول للمتابعة</p>

        <form action={login} className="space-y-4">
          <div>
            <label className="label">البريد الإلكتروني</label>
            <input
              type="email"
              name="email"
              required
              className="input-field"
              placeholder="example@clinic.com"
            />
          </div>
          <div>
            <label className="label">كلمة المرور</label>
            <input type="password" name="password" required className="input-field" />
          </div>

          {searchParams?.error && (
            <p className="text-red-600 text-sm text-center">{searchParams.error}</p>
          )}

          <button type="submit" className="btn-primary w-full">
            دخول
          </button>
        </form>
      </div>
    </div>
  );
}
