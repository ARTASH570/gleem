import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return NextResponse.json({ error: "الصفحة دي للأدمن بس" }, { status: 403 });
  }

  const [
    { data: patients },
    { data: invoices },
    { data: invoiceItems },
    { data: inventoryItems },
    { data: inventoryTx },
    { data: appointments },
    { data: expenses },
    { data: treatments },
    { data: treatmentPlans },
  ] = await Promise.all([
    supabase.from("patients").select("*").order("created_at"),
    supabase.from("invoices").select("*, patients(full_name)").order("created_at"),
    supabase.from("invoice_items").select("*"),
    supabase.from("inventory_items").select("*").order("name"),
    supabase.from("inventory_transactions").select("*").order("created_at"),
    supabase.from("appointments").select("*, patients(full_name)").order("appointment_date"),
    supabase.from("expenses").select("*").order("expense_date"),
    supabase.from("treatments").select("*").order("name"),
    supabase.from("treatment_plans").select("*, patients(full_name)").order("created_at"),
  ]);

  const wb = XLSX.utils.book_new();

  const patientsSheet = (patients ?? []).map((p) => ({
    الاسم: p.full_name,
    التليفون: p.phone,
    "الرقم القومي": p.national_id,
    "تاريخ الميلاد": p.birth_date,
    النوع: p.gender === "male" ? "ذكر" : p.gender === "female" ? "أنثى" : "",
    العنوان: p.address,
    "ملاحظات طبية": p.medical_notes,
    "تاريخ التسجيل": p.created_at,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(patientsSheet), "العيانين");

  const invoicesSheet = (invoices ?? []).map((inv: any) => ({
    "رقم الفاتورة": inv.invoice_number,
    العيان: inv.patients?.full_name,
    الإجمالي: inv.total_amount,
    المدفوع: inv.paid_amount,
    الحالة: inv.status,
    ملاحظات: inv.notes,
    التاريخ: inv.created_at,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoicesSheet), "الفواتير");

  const itemsSheet = (invoiceItems ?? []).map((it) => ({
    "رقم الفاتورة": it.invoice_id,
    الوصف: it.description,
    الكمية: it.quantity,
    السعر: it.unit_price,
    الإجمالي: it.total_price,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemsSheet), "بنود الفواتير");

  const inventorySheet = (inventoryItems ?? []).map((i) => ({
    الصنف: i.name,
    الوحدة: i.unit,
    "الكمية الحالية": i.quantity,
    "الحد الأدنى": i.min_quantity,
    "تكلفة الوحدة": i.unit_cost,
    نشط: i.is_active ? "نعم" : "لا",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventorySheet), "المخزن");

  const invTxSheet = (inventoryTx ?? []).map((t) => ({
    الصنف: t.inventory_item_id,
    "التغيير في الكمية": t.change_qty,
    السبب: t.reason,
    "رقم الفاتورة المرتبطة": t.reference_invoice_id,
    التاريخ: t.created_at,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invTxSheet), "حركة المخزون");

  const appointmentsSheet = (appointments ?? []).map((a: any) => ({
    العيان: a.patients?.full_name,
    "التاريخ والوقت": a.appointment_date,
    الحالة: a.status,
    ملاحظات: a.notes,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(appointmentsSheet), "المواعيد");

  const expensesSheet = (expenses ?? []).map((e) => ({
    البيان: e.title,
    المبلغ: e.amount,
    التاريخ: e.expense_date,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expensesSheet), "المصاريف");

  const treatmentsSheet = (treatments ?? []).map((t) => ({
    الخدمة: t.name,
    "السعر الافتراضي": t.default_price,
    نشط: t.is_active ? "نعم" : "لا",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(treatmentsSheet), "الخدمات");

  const treatmentPlansSheet = (treatmentPlans ?? []).map((p: any) => ({
    العيان: p.patients?.full_name,
    العنوان: p.title,
    ملاحظات: p.notes,
    الحالة: p.status === "active" ? "شغالة" : p.status === "completed" ? "خلصت" : "اتلغت",
    "تاريخ الإنشاء": p.created_at,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(treatmentPlansSheet), "خطط العلاج");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  // سجّل إن النسخة الاحتياطية اتحمّلت دلوقتي
  await supabase
    .from("app_settings")
    .update({ last_backup_at: new Date().toISOString() })
    .eq("id", true);

  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="gleem-backup-${today}.xlsx"`,
    },
  });
}
