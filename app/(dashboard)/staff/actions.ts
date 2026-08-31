"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireDoctor } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";

export async function createStaffAccount(formData: FormData) {
  const profile = await requireDoctor();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;
  const role = formData.get("role") as string;

  // الفورم بيدي بس "دكتور" أو "سكرتيرة"، وقاعدة البيانات أصلاً برفض
  // أي محاولة لإنشاء بروفايل بدور "admin" من هنا (سياسة profiles_doctor_all).
  // التحقق ده دفاع إضافي بس عشان أي قيمة غريبة توصل هنا (تلاعب في
  // الفورم مثلاً) تترفض برسالة واضحة من غير ما توصل لقاعدة البيانات أصلاً.
  if (role !== "doctor" && role !== "secretary") {
    redirect(`/staff?error=${encodeURIComponent("دور غير صحيح")}`);
  }

  if (password.length < 8) {
    redirect(`/staff?error=${encodeURIComponent("كلمة المرور لازم تكون 8 حروف على الأقل")}`);
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    redirect(
      `/staff?error=${encodeURIComponent("كلمة المرور لازم تحتوي على حروف وأرقام مع بعض")}`
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    redirect(`/staff?error=${encodeURIComponent(error.message)}`);
  }

  const supabase = createClient();
  await supabase.from("profiles").insert({
    id: data.user.id,
    full_name: fullName,
    role,
  });

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "create",
    entityType: "staff",
    entityLabel: fullName,
    description: `إضافة حساب موظف جديد: ${fullName} (${role === "doctor" ? "دكتور" : "سكرتيرة"})`,
  });

  revalidatePath("/staff");
}

export async function toggleStaffActive(profileId: string, isActive: boolean) {
  const profile = await requireDoctor();
  const supabase = createClient();
  await supabase.from("profiles").update({ is_active: !isActive }).eq("id", profileId);

  const { data: staffMember } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", profileId)
    .single();

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "update",
    entityType: "staff",
    entityLabel: staffMember?.full_name,
    description: `${isActive ? "إيقاف" : "تفعيل"} حساب: ${staffMember?.full_name}`,
  });

  revalidatePath("/staff");
}
