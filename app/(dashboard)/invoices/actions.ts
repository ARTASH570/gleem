"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile, requireDoctor, checkMaintenanceBlock } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

export async function createInvoiceAction(formData: FormData) {
  const profile = await requireProfile();
  const supabase = createClient();

  const maintenanceError = await checkMaintenanceBlock(profile);
  if (maintenanceError) {
    redirect(`/invoices/new?error=${encodeURIComponent(maintenanceError)}`);
  }

  let patientId = formData.get("patient_id") as string;
  const doctorId = (formData.get("doctor_id") as string) || null;
  const paidAmount = Number(formData.get("paid_amount") || 0);
  const notes = (formData.get("notes") as string) || "";

  // لو العيان جديد (مش مسجل قبل كده)، سجّله تلقائيًا الأول
  const isNewPatient = formData.get("is_new_patient") === "1";
  if (isNewPatient) {
    const newName = (formData.get("new_patient_name") as string)?.trim();
    const newPhone = (formData.get("new_patient_phone") as string)?.trim();
    if (!newName) {
      redirect(`/invoices/new?error=${encodeURIComponent("لازم تكتب اسم العيان الجديد")}`);
    }

    if (newPhone) {
      const { data: existingPatient } = await supabase
        .from("patients")
        .select("id, full_name")
        .ilike("full_name", newName)
        .eq("phone", newPhone)
        .maybeSingle();

      if (existingPatient) {
        redirect(
          `/invoices/new?error=${encodeURIComponent(
            `فيه عيان مسجل بالفعل بنفس الاسم والتليفون: "${existingPatient.full_name}". دوّر عليه في صفحة العيانين واختاره بدل ما تسجله تاني.`
          )}`
        );
      }
    }

    const { data: similarPatients } = await supabase.rpc("find_similar_patients", {
      p_name: newName,
      p_threshold: 0.35,
      p_limit: 3,
    });

    if (formData.get("confirm_duplicate") !== "1" && similarPatients && similarPatients.length > 0) {
      const names = similarPatients
        .map((p: any) => `"${p.full_name}"${p.phone ? ` (${p.phone})` : ""}`)
        .join("، ");
      redirect(
        `/invoices/new?error=${encodeURIComponent(
          `فيه عيانين بأسامي شبه "${newName}": ${names}. لو حد منهم هو نفسه دوّر عليه بدل التسجيل. لو متأكد إنه شخص مختلف، اعمل الفاتورة تاني وحط ✔ "متأكد إنه عيان جديد".`
        )}`
      );
    }

    const { data: newPatient, error: newPatientError } = await supabase
      .from("patients")
      .insert({
        full_name: newName,
        phone: (formData.get("new_patient_phone") as string) || null,
        national_id: (formData.get("new_patient_national_id") as string) || null,
        created_by: profile.id,
      })
      .select("id")
      .single();

    if (newPatientError || !newPatient) {
      redirect(
        `/invoices/new?error=${encodeURIComponent(newPatientError?.message ?? "حصل خطأ في تسجيل العيان")}`
      );
    }

    patientId = newPatient!.id;
  }

  const itemsRaw = formData.get("items_json") as string;
  const items = JSON.parse(itemsRaw || "[]");

  if (!items.length) {
    redirect(
      `/invoices/new?patient_id=${patientId}&error=${encodeURIComponent("لازم تضيف بند واحد على الأقل")}`
    );
  }

  const { data: invoiceId, error } = await supabase.rpc("create_invoice", {
    p_patient_id: patientId,
    p_doctor_id: doctorId,
    p_created_by: profile.id,
    p_paid_amount: paidAmount,
    p_notes: notes,
    p_items: items,
    p_treatment_plan_id: (formData.get("treatment_plan_id") as string) || null,
  });

  if (error) {
    redirect(`/invoices/new?patient_id=${patientId}&error=${encodeURIComponent(error.message)}`);
  }

  // لو فيه دفعة أولية وقت إنشاء الفاتورة، بنسجلها في جدول payments
  // بطريقة الدفع اللي اتحددت (نقدي/تحويل) عشان تبان في تاريخ الدفعات
  if (paidAmount > 0) {
    const paymentMethod = (formData.get("payment_method") as string) === "transfer" ? "transfer" : "cash";
    await supabase.from("payments").insert({
      invoice_id: invoiceId,
      amount: paidAmount,
      method: paymentMethod,
      created_by: profile.id,
    });
  }

  const { data: newInvoice } = await supabase
    .from("invoices")
    .select("invoice_number, patients(full_name)")
    .eq("id", invoiceId)
    .single();

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "create",
    entityType: "invoice",
    entityLabel: `فاتورة #${newInvoice?.invoice_number}`,
    description: `فاتورة جديدة لـ ${(newInvoice as any)?.patients?.full_name ?? ""} بمبلغ ${paidAmount} ج.م مدفوع`,
  });

  revalidatePath("/invoices");
  revalidatePath("/inventory");
  redirect(`/invoices/${invoiceId}`);
}

export async function updatePaymentAction(invoiceId: string, formData: FormData) {
  const profile = await requireProfile();
  const supabase = createClient();

  const maintenanceError = await checkMaintenanceBlock(profile);
  if (maintenanceError) {
    redirect(`/invoices/${invoiceId}?error=${encodeURIComponent(maintenanceError)}`);
  }

  const addPayment = Number(formData.get("add_payment") || 0);
  if (addPayment <= 0) return;

  const paymentMethod = (formData.get("payment_method") as string) === "transfer" ? "transfer" : "cash";

  // بنستخدم RPC (record_payment) بدل تحديث الجدول مباشرة: التحديث
  // المباشر كان مقصور على الدكتور بس على مستوى RLS (سياسة
  // doctor_update_invoices)، فلو سكرتيرة حصّلت دفعة كان التحديث بيترفض
  // بهدوء من غير أي error، والفلوس ما كانتش بتتسجل فعليًا. الدالة دي
  // شغالة لأي موظف فعّال وبتتأكد كمان إن المبلغ مايتخطاش المتبقي،
  // وبتسجل طريقة الدفع في جدول payments.
  const { data: updatedInvoice, error } = await supabase.rpc("record_payment", {
    p_invoice_id: invoiceId,
    p_add_payment: addPayment,
    p_method: paymentMethod,
  });

  if (error || !updatedInvoice) {
    redirect(`/invoices/${invoiceId}?error=${encodeURIComponent(error?.message ?? "حصل خطأ في تحصيل الدفعة")}`);
  }

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "update",
    entityType: "invoice",
    entityLabel: `فاتورة #${(updatedInvoice as any).invoice_number}`,
    description: `تحصيل دفعة ${addPayment} ج.م`,
  });

  revalidatePath(`/invoices/${invoiceId}`);
}

export async function cancelInvoiceAction(invoiceId: string): Promise<{ error?: string }> {
  const profile = await requireDoctor();
  const supabase = createClient();

  const maintenanceError = await checkMaintenanceBlock(profile);
  if (maintenanceError) return { error: maintenanceError };

  const { data: invoice } = await supabase
    .from("invoices")
    .select("invoice_number, status, patients(full_name)")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return { error: "الفاتورة غير موجودة" };
  if (invoice.status === "cancelled") return { error: "الفاتورة ملغاة بالفعل" };

  const { error } = await supabase.rpc("cancel_invoice", {
    p_invoice_id: invoiceId,
    p_cancelled_by: profile.id,
  });

  if (error) return { error: error.message };

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "update",
    entityType: "invoice",
    entityLabel: `فاتورة #${invoice.invoice_number}`,
    description: `إلغاء فاتورة #${invoice.invoice_number} لـ ${
      (invoice as any).patients?.full_name ?? ""
    } (تم إرجاع المخزون المستهلك)`,
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/inventory");
  return {};
}
