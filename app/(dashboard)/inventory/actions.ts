"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile, checkMaintenanceBlock } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

export async function createInventoryItem(formData: FormData) {
  const profile = await requireProfile();
  const supabase = createClient();

  if (await checkMaintenanceBlock(profile)) return;

  const quantity = Number(formData.get("quantity") || 0);
  const name = formData.get("name") as string;

  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      name,
      unit: (formData.get("unit") as string) || "قطعة",
      quantity,
      min_quantity: Number(formData.get("min_quantity") || 0),
      unit_cost: Number(formData.get("unit_cost") || 0),
    })
    .select("id")
    .single();

  if (!error && quantity > 0) {
    await supabase.from("inventory_transactions").insert({
      inventory_item_id: data!.id,
      change_qty: quantity,
      reason: "restock",
      created_by: profile.id,
    });
  }

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "create",
    entityType: "inventory_item",
    entityLabel: name,
    description: `إضافة صنف جديد للمخزن: ${name} (${quantity})`,
  });

  revalidatePath("/inventory");
}

export async function restockItem(itemId: string, formData: FormData) {
  const profile = await requireProfile();
  const supabase = createClient();

  if (await checkMaintenanceBlock(profile)) return;

  const addQty = Number(formData.get("add_qty") || 0);
  if (addQty <= 0) return;

  const { data: item } = await supabase
    .from("inventory_items")
    .select("name")
    .eq("id", itemId)
    .single();

  // بنستخدم RPC (restock_inventory_item) بدل قراءة الكمية الحالية
  // وكتابتها في خطوتين منفصلتين، عشان نتجنب أي تعارض نادر لو حصل
  // توريدين لنفس الصنف في نفس اللحظة بالظبط (الدالة بتقفل الصف وتحدثه
  // وتسجل الحركة كلهم جوه transaction واحدة).
  const { error } = await supabase.rpc("restock_inventory_item", {
    p_item_id: itemId,
    p_add_qty: addQty,
    p_actor: profile.id,
  });

  if (error) return;

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "update",
    entityType: "inventory_item",
    entityLabel: item?.name,
    description: `توريد ${addQty} إضافي لصنف: ${item?.name}`,
  });

  revalidatePath("/inventory");
}

export async function deleteInventoryItem(itemId: string) {
  const profile = await requireProfile();
  const supabase = createClient();

  if (await checkMaintenanceBlock(profile)) return;

  const { data: item } = await supabase
    .from("inventory_items")
    .select("name")
    .eq("id", itemId)
    .single();

  // بنعمله "غير نشط" بدل مسحه فعليًا، عشان سجل الفواتير القديمة اللي
  // استخدمته يفضل سليم. هيختفي من كل القوائم والفواتير الجديدة.
  await supabase.from("inventory_items").update({ is_active: false }).eq("id", itemId);

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "delete",
    entityType: "inventory_item",
    entityLabel: item?.name,
    description: `مسح صنف من المخزن: ${item?.name}`,
  });

  revalidatePath("/inventory");
}

export async function linkTreatmentUsage(formData: FormData) {
  await requireProfile();
  const supabase = createClient();

  await supabase.from("treatment_inventory_usage").upsert(
    {
      treatment_id: formData.get("treatment_id") as string,
      inventory_item_id: formData.get("inventory_item_id") as string,
      quantity_used: Number(formData.get("quantity_used") || 1),
    },
    { onConflict: "treatment_id,inventory_item_id" }
  );

  revalidatePath("/treatments");
}
