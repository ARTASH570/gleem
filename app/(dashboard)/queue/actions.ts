"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile, requireDoctor } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

type ActionResult = { error?: string };

// السكرتيرة (أو أي موظف) بتضيف عيان للطابور، إما من موعد موجود أو
// زيارة مباشرة (walk-in) من غير حجز مسبق
export async function addToQueue(patientId: string, appointmentId: string | null): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = createClient();

  if (!patientId) return { error: "لازم تختار عيان" };

  const { data: patient } = await supabase
    .from("patients")
    .select("full_name")
    .eq("id", patientId)
    .single();

  const { error } = await supabase.from("queue_entries").insert({
    patient_id: patientId,
    appointment_id: appointmentId || null,
    checked_in_by: profile.id,
  });

  if (error) return { error: error.message };

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "create",
    entityType: "queue",
    entityLabel: patient?.full_name,
    description: `إضافة ${patient?.full_name ?? "عيان"} للطابور`,
  });

  revalidatePath("/");
  return {};
}

// الدكتور بس بيقدر يبدأ عيان (بيتأكد كمان جوه الـ RPC إن مفيش عيان
// تاني in_progress في نفس اللحظة)
export async function startQueueEntry(entryId: string): Promise<ActionResult> {
  await requireDoctor();
  const supabase = createClient();

  const { error } = await supabase.rpc("start_queue_entry", { p_entry_id: entryId });

  if (error) return { error: error.message };

  revalidatePath("/");
  return {};
}

// الدكتور بس بيقدر ينهي الكشف
export async function completeQueueEntry(entryId: string) {
  const profile = await requireDoctor();
  const supabase = createClient();

  await supabase
    .from("queue_entries")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("status", "in_progress");

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "update",
    entityType: "queue",
    description: "إنهاء الكشف",
  });

  revalidatePath("/");
}

// أي موظف يقدر يتخطى عيان (مثلاً استأذن أو اتأخر)
export async function skipQueueEntry(entryId: string) {
  const profile = await requireProfile();
  const supabase = createClient();

  await supabase
    .from("queue_entries")
    .update({ status: "skipped" })
    .eq("id", entryId)
    .eq("status", "waiting");

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "update",
    entityType: "queue",
    description: "تخطي عيان من الطابور",
  });

  revalidatePath("/");
}

// إرجاع عيان اتخطى تاني لآخر الطابور
export async function requeueEntry(entryId: string) {
  await requireProfile();
  const supabase = createClient();

  await supabase
    .from("queue_entries")
    .update({ status: "waiting", created_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("status", "skipped");

  revalidatePath("/");
}
