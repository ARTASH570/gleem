import { createClient } from "@/lib/supabase/server";

export async function logAudit({
  actorId,
  actorName,
  action,
  entityType,
  entityLabel,
  description,
}: {
  actorId: string;
  actorName: string;
  action: "create" | "update" | "delete";
  entityType: string;
  entityLabel?: string;
  description?: string;
}) {
  const supabase = createClient();
  await supabase.from("audit_log").insert({
    actor_id: actorId,
    actor_name: actorName,
    action,
    entity_type: entityType,
    entity_label: entityLabel ?? null,
    description: description ?? null,
  });
}
