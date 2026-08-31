"use server";

import { createClient } from "@/lib/supabase/server";
import { requireDoctor } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function addExpense(formData: FormData) {
  const profile = await requireDoctor();
  const supabase = createClient();

  await supabase.from("expenses").insert({
    title: formData.get("title") as string,
    amount: Number(formData.get("amount") || 0),
    expense_date: (formData.get("expense_date") as string) || new Date().toISOString().slice(0, 10),
    created_by: profile.id,
  });

  revalidatePath("/reports");
}

export async function updateExpense(expenseId: string, formData: FormData): Promise<{ error?: string }> {
  await requireDoctor();
  const supabase = createClient();

  const title = formData.get("title") as string;
  const amount = Number(formData.get("amount") || 0);

  if (!title.trim() || amount <= 0) {
    return { error: "البيان والمبلغ مطلوبين" };
  }

  await supabase
    .from("expenses")
    .update({
      title: title.trim(),
      amount,
      expense_date: (formData.get("expense_date") as string) || new Date().toISOString().slice(0, 10),
    })
    .eq("id", expenseId);

  revalidatePath("/reports");
  return {};
}

export async function deleteExpense(expenseId: string) {
  await requireDoctor();
  const supabase = createClient();
  await supabase.from("expenses").delete().eq("id", expenseId);
  revalidatePath("/reports");
}
