-- ============================================================
-- خريطة أسنان لكل عيان (32 سنة، حالة كل سنة)
-- ============================================================
create table if not exists patient_teeth (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  tooth_number int not null check (tooth_number between 1 and 32),
  status text not null default 'sound' check (
    status in ('sound', 'filled', 'decayed', 'missing', 'crown', 'root_canal', 'needs_treatment')
  ),
  notes text,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  unique (patient_id, tooth_number)
);

alter table patient_teeth enable row level security;
create policy "staff_all_teeth" on patient_teeth for all using (is_staff()) with check (is_staff());

-- ============================================================
-- سجل التعديلات (مين عمل إيه وإمتى)
-- ============================================================
create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references profiles(id),
  actor_name text not null,
  action text not null, -- create | update | delete
  entity_type text not null, -- patient | invoice | inventory_item | treatment | appointment | staff
  entity_label text,
  description text,
  created_at timestamptz not null default now()
);

alter table audit_log enable row level security;
create policy "doctor_select_audit" on audit_log for select using (is_doctor());
create policy "staff_insert_audit" on audit_log for insert with check (is_staff());
