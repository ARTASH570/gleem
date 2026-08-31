"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

type Result = { error?: string };

export async function createTreatmentPlan(patientId: string, formData: FormData): Promise<Result> {
  const profile = await requireProfile();
  const supabase = createClient();

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "لازم تكتب عنوان لخطة العلاج" };

  const { error } = await supabase.from("treatment_plans").insert({
    patient_id: patientId,
    title,
    notes: (formData.get("notes") as string)?.trim() || null,
    created_by: profile.id,
  });

  if (error) return { error: error.message };

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "create",
    entityType: "treatment_plan",
    entityLabel: title,
    description: `خطة علاج جديدة: ${title}`,
  });

  revalidatePath(`/patients/${patientId}`);
  return {};
}

const STATUS_LABELS: Record<string, string> = {
  active: "شغالة",
  completed: "خلصت",
  cancelled: "اتلغت",
};

export async function updateTreatmentPlanStatus(
  patientId: string,
  planId: string,
  status: "active" | "completed" | "cancelled"
): Promise<Result> {
  const profile = await requireProfile();
  const supabase = createClient();

  const { error } = await supabase.from("treatment_plans").update({ status }).eq("id", planId);
  if (error) return { error: error.message };

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "update",
    entityType: "treatment_plan",
    description: `تغيير حالة خطة العلاج إلى "${STATUS_LABELS[status] ?? status}"`,
  });

  revalidatePath(`/patients/${patientId}`);
  return {};
}
