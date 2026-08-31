"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// إخفاء تنبيه "الصنف قرب يخلص" لمدة يوم واحد بس. لو لسه الكمية قليلة
// بعد اليوم ده، التنبيه هيرجع يظهر تلقائيًا في الهوم سكرين.
export async function dismissLowStockAlert(itemId: string) {
  await requireProfile();
  const supabase = createClient();

  const dismissedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from("inventory_items")
    .update({ low_stock_dismissed_until: dismissedUntil })
    .eq("id", itemId);

  revalidatePath("/");
}
