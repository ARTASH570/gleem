// رسم بسيط بالـ CSS بس (من غير أي مكتبة رسم بياني) لإيرادات آخر 7 أيام.
// الارتفاعات بالبيكسل مباشرة (مش نسبة مئوية) عشان نتجنب مشكلة شائعة في
// الـ CSS: العنصر لما يبقى flex child وارتفاعه % بيتجاهله المتصفح لو
// الأب مالوش ارتفاع محدد صراحة.
const MAX_BAR_HEIGHT = 96;

export default function RevenueChart({ data }: { data: { label: string; amount: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.amount));

  return (
    <div className="flex items-end justify-between gap-2" style={{ height: MAX_BAR_HEIGHT + 40 }}>
      {data.map((d, i) => {
        const barHeight = d.amount > 0 ? Math.max(4, Math.round((d.amount / max) * MAX_BAR_HEIGHT)) : 2;
        return (
          <div key={i} className="flex-1 flex flex-col items-center">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 whitespace-nowrap">
              {d.amount > 0 ? Math.round(d.amount).toLocaleString() : ""}
            </span>
            <div
              className="w-full max-w-[28px] bg-brand-500 dark:bg-brand-400 rounded-t"
              style={{ height: `${barHeight}px` }}
              title={`${d.amount.toLocaleString()} ج.م`}
            />
            <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 whitespace-nowrap">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
