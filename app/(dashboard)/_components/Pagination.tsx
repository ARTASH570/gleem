import Link from "next/link";

// كومبوننت مشترك للتنقل بين الصفحات. بياخد الـ searchParams الحالية
// وبيولد روابط للصفحة اللي فاتت/الجاية مع الحفاظ على أي فلاتر تانية
// (زي ?q= في صفحة العيانين)
export default function Pagination({
  basePath,
  currentPage,
  totalPages,
  totalCount,
  searchParams,
}: {
  basePath: string;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  searchParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  function pageHref(page: number) {
    const params = new URLSearchParams();
    Object.entries(searchParams ?? {}).forEach(([key, value]) => {
      if (value && key !== "page") params.set(key, value);
    });
    params.set("page", String(page));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <span className="text-gray-500">{totalCount.toLocaleString()} نتيجة</span>
      <div className="flex items-center gap-2">
        <Link
          href={pageHref(Math.max(1, currentPage - 1))}
          aria-disabled={currentPage <= 1}
          className={`btn-secondary px-3 py-1 ${
            currentPage <= 1 ? "pointer-events-none opacity-40" : ""
          }`}
        >
          → السابق
        </Link>
        <span className="text-gray-500">
          صفحة {currentPage} من {totalPages}
        </span>
        <Link
          href={pageHref(Math.min(totalPages, currentPage + 1))}
          aria-disabled={currentPage >= totalPages}
          className={`btn-secondary px-3 py-1 ${
            currentPage >= totalPages ? "pointer-events-none opacity-40" : ""
          }`}
        >
          التالي ←
        </Link>
      </div>
    </div>
  );
}
