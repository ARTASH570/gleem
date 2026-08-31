-- ============================================================
-- Performance indexes
-- مفيش أي indexes غير المفاتيح الأساسية قبل كده، فكل بحث/ترتيب/join
-- كان بيعمل full table scan. الملف ده بيضيف الأساسيات:
--   1) indexes على أعمدة الـ foreign keys (invoices.patient_id, إلخ)
--   2) indexes على أعمدة الترتيب/الفلترة الشائعة (created_at, appointment_date)
--   3) pg_trgm + GIN indexes عشان البحث بـ ilike '%...%' على الاسم/التليفون
--      يبقى سريع (index عادي (btree) مش بيفيد مع ilike بحث جزئي)
-- ============================================================

create extension if not exists pg_trgm;

-- ---------- Foreign keys ----------
create index if not exists idx_appointments_patient_id on appointments(patient_id);
create index if not exists idx_appointments_doctor_id on appointments(doctor_id);
create index if not exists idx_invoices_patient_id on invoices(patient_id);
create index if not exists idx_invoices_doctor_id on invoices(doctor_id);
create index if not exists idx_invoice_items_invoice_id on invoice_items(invoice_id);
create index if not exists idx_invoice_items_treatment_id on invoice_items(treatment_id);
create index if not exists idx_inventory_transactions_item_id on inventory_transactions(inventory_item_id);
create index if not exists idx_inventory_transactions_invoice_id on inventory_transactions(reference_invoice_id);
create index if not exists idx_treatment_inventory_usage_item_id on treatment_inventory_usage(inventory_item_id);

-- ---------- Sorting / filtering (dashboard, lists, calendar) ----------
create index if not exists idx_appointments_date on appointments(appointment_date);
create index if not exists idx_invoices_created_at on invoices(created_at desc);
create index if not exists idx_patients_created_at on patients(created_at desc);
create index if not exists idx_inventory_items_active on inventory_items(is_active) where is_active = true;
create index if not exists idx_audit_log_created_at on audit_log(created_at desc);

-- ---------- Text search (ilike '%...%') ----------
create index if not exists idx_patients_name_trgm on patients using gin (full_name gin_trgm_ops);
create index if not exists idx_patients_phone_trgm on patients using gin (phone gin_trgm_ops);
