import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Endpoint خفيف جدًا هدفه اتنين:
// 1) يعمل query بسيط جدًا على الداتابيز عشان Supabase (على الباقة المجانية)
//    ميعتبرش المشروع "خامل" ويوقفه بعد أسبوع من غير نشاط.
// 2) الطلب نفسه بيخلي Vercel function تفضل "صاحية" أكتر، فبيقلل احتمال
//    الـ cold start لما حد فعلي يفتح السيستم.
//
// بيتنده عليه من خدمة جدولة خارجية مجانية (زي cron-job.org) كل 5 دقايق مثلاً.
// بيستخدم createAdminClient لأن الطلب ده جاي من غير تسجيل دخول، فمينفعش
// نعتمد على سياسات RLS العادية (اللي بتتطلب يوزر مسجل).
export async function GET() {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("app_settings")
    .select("id")
    .eq("id", true)
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, time: new Date().toISOString() });
}