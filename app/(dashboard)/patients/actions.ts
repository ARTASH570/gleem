"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

type CreatePatientInput = {
  fullName: string;
  phone: string;
  nationalId: string;
  birthDate: string;
  gender: string;
  address: string;
  medicalNotes: string;
  confirmDuplicate?: boolean;
};

type CreatePatientResult = { error?: string; duplicateWarning?: string };

export async function createPatient(input: CreatePatientInput): Promise<CreatePatientResult> {
  const profile = await requireProfile();
  const supabase = createClient();

  const fullName = input.fullName.trim();
  const phone = input.phone.trim();

  if (!fullName) {
    return { error: "لازم تكتب اسم العيان" };
  }

  // لو مفيش تأكيد إنه عيان مختلف، ندور الأول على تطابق تام (نفس الاسم
  // ونفس التليفون بالظبط)
  if (phone && !input.confirmDuplicate) {
    const { data: existing } = await supabase
      .from("patients")
      .select("id, full_name")
      .ilike("full_name", fullName)
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      return {
        duplicateWarning: `فيه عيان مسجل بالفعل بنفس الاسم والتليفون: "${existing.full_name}". لو ده نفس العيان، دوّر عليه في صفحة العيانين بدل ما تسجله تاني. لو متأكد إنه شخص مختلف، اضغط "احفظ برضو".`,
      };
    }
  }

  // ولو مفيش تطابق تام، ندور على أسامي متشابهة (زي غلطة إملائية) حتى
  // لو التليفون مختلف — تنبيه بس، مش منع
  if (!input.confirmDuplicate) {
    const { data: similar } = await supabase.rpc("find_similar_patients", {
      p_name: fullName,
      p_threshold: 0.35,
      p_limit: 3,
    });

    if (similar && similar.length > 0) {
      const names = similar.map((p: any) => `"${p.full_name}"${p.phone ? ` (${p.phone})` : ""}`).join("، ");
      return {
        duplicateWarning: `فيه عيانين بأسامي شبه دي في السيستم: ${names}. لو حد منهم هو نفسه، دوّر عليه بدل التسجيل. لو متأكد إنه شخص مختلف، اضغط "احفظ برضو".`,
      };
    }
  }

  const { data, error } = await supabase
    .from("patients")
    .insert({
      full_name: fullName,
      phone: phone || null,
      national_id: input.nationalId || null,
      birth_date: input.birthDate || null,
      gender: input.gender || null,
      address: input.address || null,
      medical_notes: input.medicalNotes || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "create",
    entityType: "patient",
    entityLabel: fullName,
    description: `تسجيل عيان جديد: ${fullName}`,
  });

  revalidatePath("/patients");
  redirect(`/patients/${data.id}`);
}

export async function updatePatient(patientId: string, formData: FormData) {
  const profile = await requireProfile();
  const supabase = createClient();

  const fullName = formData.get("full_name") as string;

  await supabase
    .from("patients")
    .update({
      full_name: fullName,
      phone: formData.get("phone") as string,
      national_id: formData.get("national_id") as string,
      birth_date: (formData.get("birth_date") as string) || null,
      gender: (formData.get("gender") as string) || null,
      address: formData.get("address") as string,
      medical_notes: formData.get("medical_notes") as string,
      updated_at: new Date().toISOString(),
    })
    .eq("id", patientId);

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "update",
    entityType: "patient",
    entityLabel: fullName,
    description: `تعديل بيانات العيان: ${fullName}`,
  });

  revalidatePath(`/patients/${patientId}`);
}

const TOOTH_STATUS_LABELS: Record<string, string> = {
  sound: "سليمة",
  filled: "محشوة",
  decayed: "بها تسوس",
  missing: "مخلوعة",
  crown: "تاج",
  root_canal: "عصب",
  needs_treatment: "محتاجة علاج",
};

export async function updateToothStatus(
  patientId: string,
  toothNumber: number,
  status: string,
  notes: string
) {
  const profile = await requireProfile();
  const supabase = createClient();

  await supabase.from("patient_teeth").upsert(
    {
      patient_id: patientId,
      tooth_number: toothNumber,
      status,
      notes: notes || null,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "patient_id,tooth_number" }
  );

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "update",
    entityType: "dental_chart",
    description: `تحديث حالة السنة رقم ${toothNumber} إلى "${TOOTH_STATUS_LABELS[status] ?? status}"`,
  });

  revalidatePath(`/patients/${patientId}`);
}
