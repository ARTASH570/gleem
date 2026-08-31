-- ============================================================
-- Migration 0017: خطط العلاج المتعددة الجلسات
-- خطة علاج بتجمع كذا فاتورة (جلسة) لنفس العلاج تحت عنوان واحد،
-- عشان يبان الموقف الكلي للعيان بدل ما كل فاتورة تكون منفصلة.
-- ============================================================

create table if not exists treatment_plans (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id),
  doctor_id uuid references profiles(id),
  title text not null,
  notes text,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_treatment_plans_patient_id on treatment_plans(patient_id);

alter table treatment_plans enable row level security;

-- زي المرضى والمواعيد بالظبط: أي موظف فعّال يقدر يدير خطط العلاج بالكامل
create policy "staff_all_treatment_plans" on treatment_plans
  for all using (is_staff()) with check (is_staff());

-- ربط اختياري بين الفاتورة وخطة العلاج اللي هي جلسة منها
alter table invoices add column if not exists treatment_plan_id uuid references treatment_plans(id);
create index if not exists idx_invoices_treatment_plan_id on invoices(treatment_plan_id);

-- ------------------------------------------------------------
-- indexes بسيطة إضافية (مفيدة لعدادات التنبيهات الجديدة في الهيدر)
-- ------------------------------------------------------------
create index if not exists idx_invoices_status on invoices(status);

-- ------------------------------------------------------------
-- تحديث create_invoice: إضافة p_treatment_plan_id (اختياري، افتراضيًا
-- null) عشان تتسجل مع الفاتورة وقت إنشائها مباشرة، بدل ما نعمل update
-- منفصل بعد كده (كان هيقع في نفس مشكلة صلاحيات RLS اللي كانت سبب بق
-- الدفع الصامت قبل كده - أي تحديث مباشر على invoices بعد الإنشاء
-- ممكن يترفض بهدوء لو مش دكتور). باقي الدالة زي ما هي بالظبط من 0016.
-- ------------------------------------------------------------

create or replace function create_invoice(
  p_patient_id uuid,
  p_doctor_id uuid,
  p_created_by uuid,
  p_paid_amount numeric,
  p_notes text,
  p_items jsonb,
  p_treatment_plan_id uuid default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_invoice_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_usage record;
  v_status text;
  v_new_qty numeric;
  v_shortage record;
  v_item_id uuid;
begin
  select coalesce(sum((i->>'quantity')::numeric * (i->>'unit_price')::numeric), 0)
  into v_total
  from jsonb_array_elements(p_items) i;

  if p_paid_amount > v_total then
    raise exception 'المبلغ المدفوع (%) أكبر من إجمالي الفاتورة (%)', p_paid_amount, v_total;
  end if;

  if p_paid_amount >= v_total then
    v_status := 'paid';
  elsif p_paid_amount > 0 then
    v_status := 'partial';
  else
    v_status := 'unpaid';
  end if;

  for v_item_id in
    select distinct tiu.inventory_item_id
    from jsonb_array_elements(p_items) as item
    join treatment_inventory_usage tiu
      on tiu.treatment_id = (item->>'treatment_id')::uuid
    where item->>'treatment_id' is not null and item->>'treatment_id' <> ''
    order by tiu.inventory_item_id
  loop
    perform 1 from inventory_items where id = v_item_id for update;
  end loop;

  for v_shortage in
    select tiu.inventory_item_id, ii.name, ii.quantity as current_qty,
           sum(tiu.quantity_used * (item->>'quantity')::numeric) as needed_qty
    from jsonb_array_elements(p_items) as item
    join treatment_inventory_usage tiu
      on tiu.treatment_id = (item->>'treatment_id')::uuid
    join inventory_items ii on ii.id = tiu.inventory_item_id
    where item->>'treatment_id' is not null and item->>'treatment_id' <> ''
    group by tiu.inventory_item_id, ii.name, ii.quantity
  loop
    if v_shortage.current_qty < v_shortage.needed_qty then
      raise exception 'الكمية غير كافية في المخزون لصنف "%": المتاح % والمطلوب %',
        v_shortage.name, v_shortage.current_qty, v_shortage.needed_qty;
    end if;
  end loop;

  insert into invoices (patient_id, doctor_id, created_by, total_amount, paid_amount, status, notes, treatment_plan_id)
  values (p_patient_id, p_doctor_id, p_created_by, v_total, p_paid_amount, v_status, p_notes, p_treatment_plan_id)
  returning id into v_invoice_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into invoice_items (invoice_id, treatment_id, description, quantity, unit_price)
    values (
      v_invoice_id,
      nullif(v_item->>'treatment_id','')::uuid,
      v_item->>'description',
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_price')::numeric
    );

    if (v_item->>'treatment_id') is not null and v_item->>'treatment_id' <> '' then
      for v_usage in
        select * from treatment_inventory_usage
        where treatment_id = (v_item->>'treatment_id')::uuid
      loop
        v_new_qty := v_usage.quantity_used * (v_item->>'quantity')::numeric;

        update inventory_items
        set quantity = quantity - v_new_qty, updated_at = now()
        where id = v_usage.inventory_item_id;

        insert into inventory_transactions (inventory_item_id, change_qty, reason, reference_invoice_id, created_by)
        values (v_usage.inventory_item_id, -v_new_qty, 'invoice', v_invoice_id, p_created_by);
      end loop;
    end if;
  end loop;

  return v_invoice_id;
end;
$$;
