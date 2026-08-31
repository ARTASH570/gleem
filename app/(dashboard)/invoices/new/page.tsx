import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import InvoiceForm from "./InvoiceForm";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { patient_id?: string; treatment_plan_id?: string; error?: string };
}) {
  await requireProfile();
  const supabase = createClient();

  const [{ data: patients }, { data: treatments }, { data: treatmentPlans }] = await Promise.all([
    supabase.from("patients").select("id, full_name").order("full_name"),
    supabase.from("treatments").select("id, name, default_price").eq("is_active", true).order("name"),
    // خطط العلاج الشغالة بس، وبس لو العيان متحدد مسبقًا (جاي من صفحة
    // البروفايل بتاعته)، عشان منحملش كل الخطط لكل العيانين من غير داعي
    searchParams?.patient_id
      ? supabase
          .from("treatment_plans")
          .select("id, title")
          .eq("patient_id", searchParams.patient_id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">فاتورة جديدة</h1>
      <InvoiceForm
        patients={patients ?? []}
        treatments={(treatments ?? []) as any}
        defaultPatientId={searchParams?.patient_id}
        defaultTreatmentPlanId={searchParams?.treatment_plan_id}
        treatmentPlans={(treatmentPlans ?? []) as any}
        error={searchParams?.error}
      />
    </div>
  );
}
