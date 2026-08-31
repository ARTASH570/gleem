"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

export async function createTreatment(formData: FormData) {
  const profile = await requireProfile();
  const supabase = createClient();

  const name = formData.get("name") as string;

  await supabase.from("treatments").insert({
    name,
    default_price: Number(formData.get("default_price") || 0),
  });

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "create",
    entityType: "treatment",
    entityLabel: name,
    description: `إضافة خدمة جديدة: ${name}`,
  });

  revalidatePath("/treatments");
}

export async function deleteTreatment(treatmentId: string) {
  const profile = await requireProfile();
  const supabase = createClient();

  const { data: treatment } = await supabase
    .from("treatments")
    .select("name")
    .eq("id", treatmentId)
    .single();

  // بنعمله "غير نشط" بدل مسحه فعليًا، عشان الفواتير القديمة اللي
  // فيها الخدمة دي تفضل سليمة وتوريها صح. هيختفي من كل القوائم الجديدة.
  await supabase.from("treatments").update({ is_active: false }).eq("id", treatmentId);

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "delete",
    entityType: "treatment",
    entityLabel: treatment?.name,
    description: `مسح خدمة: ${treatment?.name}`,
  });

  revalidatePath("/treatments");
}

export async function removeUsageLink(usageId: string) {
  await requireProfile();
  const supabase = createClient();
  await supabase.from("treatment_inventory_usage").delete().eq("id", usageId);
  revalidatePath("/treatments");
}
