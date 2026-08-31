"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// بدل ما نسأل السيرفر كل شوية ثواني (polling)، دلوقتي بنستخدم Supabase
// Realtime: السيرفر هو اللي "يبلّغ" المتصفح لحظة ما يحصل تغيير فعلي في
// جدول الطابور (إضافة/تحديث/حذف)، فبيحصل router.refresh() بس وقت
// الحاجة الفعلية، مش كل 5 ثواني زي الأول. الميزة دي مجانية، مش محتاجة
// ترقية أي خطة في Supabase.
//
// وبرضه سايبين فحص بطيء جدًا (كل 30 ثانية افتراضيًا) كـ "شبكة أمان" بس،
// عشان لو الاتصال المباشر (WebSocket) اتقطع لأي سبب (شبكة ضعيفة، التاب
// كان في الخلفية...) الشاشة متفضلش واقفة على بيانات قديمة من غير ما
// حد يلاحظ.
export default function PollRefresher({ fallbackIntervalMs = 30000 }: { fallbackIntervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("queue_entries_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries" },
        () => router.refresh()
      )
      .subscribe();

    const fallback = setInterval(() => router.refresh(), fallbackIntervalMs);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(fallback);
    };
  }, [router, fallbackIntervalMs]);

  return null;
}
