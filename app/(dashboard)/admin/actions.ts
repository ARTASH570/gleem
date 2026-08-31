"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function toggleMaintenanceMode(currentlyOn: boolean) {
  await requireAdmin();
  const supabase = createClient();

  await supabase
    .from("app_settings")
    .update({ maintenance_mode: !currentlyOn })
    .eq("id", true);

  revalidatePath("/admin");
  revalidatePath("/");
}
