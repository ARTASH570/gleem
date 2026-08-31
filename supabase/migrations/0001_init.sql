-- ============================================================
-- Dental Clinic System - Initial Schema
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- ROLES ----------
do $$ begin
  create type user_role as enum ('doctor', 'secretary');
exception when duplicate_object then null; end $$;

-- ---------- PROFILES (linked to auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'secretary',
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- PATIENTS ----------
create table if not exists patients (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  phone text,
  national_id text,
  birth_date date,
  gender text check (gender in ('male','female')),
  address text,
  medical_notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- TREATMENTS (خدمات العيادة: حشو، خلع، تنظيف...) ----------
create table if not exists treatments (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  default_price numeric(10,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- INVENTORY ITEMS (المخزن) ----------
create table if not exists inventory_items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  unit text not null default 'قطعة',
  quantity numeric(10,2) not null default 0,
  min_quantity numeric(10,2) not null default 0,
  unit_cost numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- LINK: which inventory items a treatment consumes ----------
create table if not exists treatment_inventory_usage (
  id uuid primary key default uuid_generate_v4(),
  treatment_id uuid not null references treatments(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  quantity_used numeric(10,2) not null default 1,
  unique(treatment_id, inventory_item_id)
);

-- ---------- APPOINTMENTS ----------
create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid references profiles(id),
  appointment_date timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','no_show')),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- INVOICES ----------
create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  invoice_number serial,
  patient_id uuid not null references patients(id),
  doctor_id uuid references profiles(id),
  created_by uuid references profiles(id),
  total_amount numeric(10,2) not null default 0,
  paid_amount numeric(10,2) not null default 0,
  status text not null default 'unpaid' check (status in ('unpaid','partial','paid')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists invoice_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  treatment_id uuid references treatments(id),
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,2) not null default 0,
  total_price numeric(10,2) generated always as (quantity * unit_price) stored
);

-- ---------- INVENTORY TRANSACTIONS (سجل حركة المخزن) ----------
create table if not exists inventory_transactions (
  id uuid primary key default uuid_generate_v4(),
  inventory_item_id uuid not null references inventory_items(id),
  change_qty numeric(10,2) not null, -- سالب = استهلاك، موجب = توريد
  reason text not null, -- 'invoice' | 'restock' | 'adjustment'
  reference_invoice_id uuid references invoices(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- EXPENSES (مصاريف العيادة - لحساب الأرباح) ----------
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  amount numeric(10,2) not null,
  expense_date date not null default current_date,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- FUNCTION: create_invoice
-- بتعمل فاتورة + بنودها + تخصم المخزون تلقائيًا لو البند مرتبط
-- بعلاج له استهلاك محدد في treatment_inventory_usage
-- كل ده جوه transaction واحدة (لو حصل خطأ، كل حاجة بترجع)
-- ============================================================
create or replace function create_invoice(
  p_patient_id uuid,
  p_doctor_id uuid,
  p_created_by uuid,
  p_paid_amount numeric,
  p_notes text,
  p_items jsonb -- [{treatment_id, description, quantity, unit_price}, ...]
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
begin
  -- 1) احسب الإجمالي
  select coalesce(sum((i->>'quantity')::numeric * (i->>'unit_price')::numeric), 0)
  into v_total
  from jsonb_array_elements(p_items) i;

  if p_paid_amount >= v_total then
    v_status := 'paid';
  elsif p_paid_amount > 0 then
    v_status := 'partial';
  else
    v_status := 'unpaid';
  end if;

  -- 2) اعمل الفاتورة
  insert into invoices (patient_id, doctor_id, created_by, total_amount, paid_amount, status, notes)
  values (p_patient_id, p_doctor_id, p_created_by, v_total, p_paid_amount, v_status, p_notes)
  returning id into v_invoice_id;

  -- 3) اعمل بنود الفاتورة + خصم المخزون
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

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table patients enable row level security;
alter table treatments enable row level security;
alter table inventory_items enable row level security;
alter table treatment_inventory_usage enable row level security;
alter table appointments enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table inventory_transactions enable row level security;
alter table expenses enable row level security;

-- helper: هل المستخدم الحالي دكتور؟
create or replace function is_doctor() returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'doctor' and is_active = true
  );
$$;

-- helper: هل المستخدم عنده بروفايل فعال (دكتور أو سكرتيرة)؟
create or replace function is_staff() returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and is_active = true
  );
$$;

-- profiles: كل موظف يشوف بروفايله، الدكتور يشوف ويعدل الكل
create policy "profiles_select" on profiles for select using (auth.uid() = id or is_doctor());
create policy "profiles_update_own" on profiles for update using (auth.uid() = id or is_doctor());
create policy "profiles_doctor_all" on profiles for all using (is_doctor()) with check (is_doctor());

-- patients / treatments / inventory / appointments / invoices / invoice_items / inventory_transactions:
-- أي موظف فعال (دكتور أو سكرتيرة) يقدر يشوف ويضيف ويعدل
create policy "staff_select_patients" on patients for select using (is_staff());
create policy "staff_write_patients" on patients for insert with check (is_staff());
create policy "staff_update_patients" on patients for update using (is_staff());
create policy "doctor_delete_patients" on patients for delete using (is_doctor());

create policy "staff_all_treatments" on treatments for all using (is_staff()) with check (is_staff());
create policy "staff_all_inventory" on inventory_items for all using (is_staff()) with check (is_staff());
create policy "staff_all_usage" on treatment_inventory_usage for all using (is_staff()) with check (is_staff());
create policy "staff_all_appointments" on appointments for all using (is_staff()) with check (is_staff());

create policy "staff_select_invoices" on invoices for select using (is_staff());
create policy "staff_insert_invoices" on invoices for insert with check (is_staff());
create policy "doctor_update_invoices" on invoices for update using (is_doctor());
create policy "doctor_delete_invoices" on invoices for delete using (is_doctor());

create policy "staff_select_invoice_items" on invoice_items for select using (is_staff());
create policy "staff_insert_invoice_items" on invoice_items for insert with check (is_staff());

create policy "staff_select_inventory_tx" on inventory_transactions for select using (is_staff());
create policy "staff_insert_inventory_tx" on inventory_transactions for insert with check (is_staff());

-- expenses: الدكتور بس (تقارير مالية حساسة)
create policy "doctor_all_expenses" on expenses for all using (is_doctor()) with check (is_doctor());

-- ============================================================
-- Seed: بعض العلاجات الافتراضية (اختياري - عدّل زي ما يناسبك)
-- ============================================================
insert into treatments (name, default_price) values
  ('كشف', 100),
  ('حشو', 300),
  ('خلع', 250),
  ('تنظيف جير', 400),
  ('عصب', 800)
on conflict do nothing;
