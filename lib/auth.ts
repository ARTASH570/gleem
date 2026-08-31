import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type Profile = {
  id: string;
  full_name: string;
  role: "doctor" | "secretary" | "admin";
  phone: string | null;
  is_active: boolean;
};

// يجيب بروفايل المستخدم الحالي. لو مفيش جلسة أو مفيش بروفايل بيوديه لصفحة الدخول
//
// ملحوظة أداء: الـ layout والصفحة بينادوا requireProfile() كل واحد لوحده
// (الـ layout عشان يبني القائمة الجانبية، والصفحة عشان تتأكد من الصلاحية).
// من غير cache()، ده معناه نداءين لـ auth.getUser() + كويري profiles في كل
// navigation واحد. React cache() بيضمن إن نفس النتيجة بتتحسب مرة واحدة بس
// لكل request حتى لو الدالة اتنادت من أكتر من مكان.
export const requireProfile = cache(async (): Promise<Profile> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) redirect("/login");

  return profile as Profile;
});

// نفس الحاجة بس بيتأكد إن الدخول للدكتور بس (صفحات الأرباح والموظفين)
export async function requireDoctor(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "doctor") redirect("/");
  return profile;
}

// نفس الحاجة بس بيتأكد إن الدخول للأدمن بس (النسخ الاحتياطي ووضع الصيانة)
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/");
  return profile;
}

// بيتأكد إن السيستم مش تحت الصيانة قبل أي عملية كتابة حساسة (فواتير/مخزون).
// الأدمن مستثنى دايمًا (هو اللي بيقفل ويفتح وضع الصيانة أصلاً).
// بيرجع رسالة خطأ لو السيستم مقفول، أو null لو تمام - القرار في إزاي
// نعرض الرسالة (redirect أو return {error}) سايبينه لكل action بستايله
// الحالي، عشان منغيرش شكل التعامل مع الأخطاء المعمول بيه في السيستم.
export async function checkMaintenanceBlock(profile: Profile): Promise<string | null> {
  if (profile.role === "admin") return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("maintenance_mode")
    .eq("id", true)
    .single();
  return data?.maintenance_mode
    ? "السيستم تحت الصيانة دلوقتي، مينفعش تتم أي عملية كتابة. حاول تاني بعد شوية."
    : null;
}
