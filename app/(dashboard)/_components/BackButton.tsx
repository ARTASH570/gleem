"use client";

import { useRouter, usePathname } from "next/navigation";

// زرار رجوع عام بيظهر فوق كل صفحة في لوحة التحكم. بيرجع لآخر صفحة كانت
// مفتوحة (زي زرار الرجوع في المتصفح)، وبيتخفي في الصفحة الرئيسية بس
// (مفيش داعي ترجع من الصفحة الرئيسية لحتة).
export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <button
      onClick={() => router.back()}
      className="print:hidden mb-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
    >
      <span>→</span>
      <span>رجوع</span>
    </button>
  );
}