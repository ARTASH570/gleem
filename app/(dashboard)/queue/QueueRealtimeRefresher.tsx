"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// بدل ما الصفحة تسأل الداتابيز كل 5 ثواني، دلوقتي بنستمع مباشرة
// لأي تغيير في جدول queue_entries (إضافة عيان، بدء كشف، انتهاء، إلخ)
// وبمجرد ما يحصل تغيير، نعمل router.refresh() فورًا — تحديث لحظي
// من غير أي طلبات زيادة للسيرفر لما مفيش حاجة بتتغيّر فعليًا.
export default function QueueRealtimeRefresher() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("queue_entries_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries" },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
