"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { findConflictingAppointment } from "@/lib/appointments";

type ActionResult = { error?: string };

export async function createAppointment(
  patientId: string,
  appointmentDate: string,
  durationMinutes: number,
  notes: string,
  bookingSource: string
): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = createClient();

  if (!patientId || !appointmentDate) {
    return { error: "لازم تختار عيان وتحدد التاريخ والوقت" };
  }

  const conflict = await findConflictingAppointment(supabase, appointmentDate, durationMinutes);
  if (conflict) {
    const conflictTime = new Date(conflict.appointment_date).toLocaleString("ar-EG");
    return {
      error: `فيه موعد تاني متعارض في نفس الوقت: ${conflict.patients?.full_name ?? "عيان"} (${conflictTime})`,
    };
  }

  await supabase.from("appointments").insert({
    patient_id: patientId,
    appointment_date: appointmentDate,
    duration_minutes: durationMinutes,
    notes: notes || null,
    booking_source: bookingSource === "whatsapp" ? "whatsapp" : "reception",
    created_by: profile.id,
  });

  const { data: patient } = await supabase
    .from("patients")
    .select("full_name")
    .eq("id", patientId)
    .single();

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "create",
    entityType: "appointment",
    entityLabel: patient?.full_name,
    description: `حجز موعد لـ ${patient?.full_name}`,
  });

  revalidatePath("/appointments");
  revalidatePath("/appointments/calendar");
  return {};
}

export async function rescheduleAppointment(
  appointmentId: string,
  appointmentDate: string,
  durationMinutes: number,
  notes: string
): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = createClient();

  if (!appointmentDate) {
    return { error: "لازم تحدد التاريخ والوقت" };
  }

  const conflict = await findConflictingAppointment(
    supabase,
    appointmentDate,
    durationMinutes,
    appointmentId
  );
  if (conflict) {
    const conflictTime = new Date(conflict.appointment_date).toLocaleString("ar-EG");
    return {
      error: `فيه موعد تاني متعارض في نفس الوقت: ${conflict.patients?.full_name ?? "عيان"} (${conflictTime})`,
    };
  }

  const { data: existing } = await supabase
    .from("appointments")
    .select("patients(full_name)")
    .eq("id", appointmentId)
    .single();

  await supabase
    .from("appointments")
    .update({
      appointment_date: appointmentDate,
      duration_minutes: durationMinutes,
      notes: notes || null,
    })
    .eq("id", appointmentId);

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "update",
    entityType: "appointment",
    entityLabel: (existing as any)?.patients?.full_name,
    description: `تعديل ميعاد لـ ${(existing as any)?.patients?.full_name ?? "عيان"}`,
  });

  revalidatePath("/appointments");
  revalidatePath("/appointments/calendar");
  return {};
}

export async function deleteAppointment(appointmentId: string) {
  const profile = await requireProfile();
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("appointments")
    .select("patients(full_name)")
    .eq("id", appointmentId)
    .single();

  await supabase.from("appointments").delete().eq("id", appointmentId);

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "delete",
    entityType: "appointment",
    entityLabel: (existing as any)?.patients?.full_name,
    description: `مسح ميعاد لـ ${(existing as any)?.patients?.full_name ?? "عيان"}`,
  });

  revalidatePath("/appointments");
  revalidatePath("/appointments/calendar");
}

export async function updateAppointmentStatus(appointmentId: string, status: string) {
  const profile = await requireProfile();
  const supabase = createClient();
  await supabase.from("appointments").update({ status }).eq("id", appointmentId);

  const statusLabels: Record<string, string> = {
    scheduled: "محجوز",
    completed: "تم",
    cancelled: "ملغي",
    no_show: "لم يحضر",
  };

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "update",
    entityType: "appointment",
    description: `تغيير حالة موعد إلى: ${statusLabels[status] ?? status}`,
  });

  revalidatePath("/appointments");
  revalidatePath("/appointments/calendar");
}
