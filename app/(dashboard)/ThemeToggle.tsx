"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  // بنقرا الحالة الحالية من الـ <html> class (اللي السكريبت في layout.tsx
  // يكون طبقها بالفعل قبل ما الصفحة تترسم) عشان الزرار يبان بالحالة
  // الصح من أول لحظة
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch (e) {
      // localStorage ممكن يكون متمنوع (وضع تصفح خاص مثلاً)، مفيش داعي نوقف الزرار عشان كده
    }
  }

  return (
    <button
      onClick={toggle}
      type="button"
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-sm w-full text-right text-white/80 hover:text-white"
      title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
    >
      <span>{isDark ? "☀️" : "🌙"}</span>
      <span>{isDark ? "الوضع الفاتح" : "الوضع الداكن"}</span>
    </button>
  );
}
