"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  todayAppointmentsCount: number;
  lowStockCount: number;
  overdueInvoicesCount: number;
};

export default function NotificationsBell({
  todayAppointmentsCount,
  lowStockCount,
  overdueInvoicesCount,
}: Props) {
  const [open, setOpen] = useState(false);
  const total = todayAppointmentsCount + lowStockCount + overdueInvoicesCount;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        title="التنبيهات"
      >
        <span className="text-lg">🔔</span>
        {total > 0 && (
          <span className="absolute -top-1 -end-1 bg-red-500 text-white text-[10px] leading-none w-4 h-4 rounded-full flex items-center justify-center">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* لايير شفاف يقفل القائمة لو ضغطت برّه */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute end-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg z-20 p-2 text-sm">
            {total === 0 ? (
              <p className="text-gray-400 text-center py-3">مفيش تنبيهات دلوقتي 👍</p>
            ) : (
              <div className="space-y-1">
                {todayAppointmentsCount > 0 && (
                  <Link
                    href="/appointments"
                    onClick={() => setOpen(false)}
                    className="flex justify-between items-center px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
                  >
                    <span>📅 مواعيد النهاردة</span>
                    <span className="font-bold">{todayAppointmentsCount}</span>
                  </Link>
                )}
                {lowStockCount > 0 && (
                  <Link
                    href="/inventory"
                    onClick={() => setOpen(false)}
                    className="flex justify-between items-center px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
                  >
                    <span>📦 أصناف قربت تخلص</span>
                    <span className="font-bold text-red-500">{lowStockCount}</span>
                  </Link>
                )}
                {overdueInvoicesCount > 0 && (
                  <Link
                    href="/invoices"
                    onClick={() => setOpen(false)}
                    className="flex justify-between items-center px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
                  >
                    <span>🧾 فواتير مش متحصلة بالكامل</span>
                    <span className="font-bold text-orange-500">{overdueInvoicesCount}</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
