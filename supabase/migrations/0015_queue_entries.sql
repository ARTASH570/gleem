-- ============================================================
-- queue_entries: طابور انتظار العيادة
-- السكرتيرة بتضيف العيان لما يوصل ← يبقى "waiting"
-- الدكتور بيدوس "ابدأ" على اللي في الأول ← يبقى "in_progress"
-- (بشرط ميبقاش فيه عيان تاني in_progress في نفس الوقت)
-- لما الدكتور يخلّص ← "done"
-- ممكن كمان "skipped" لو العيان استأذن أو اتأخر
-- ============================================================

create table if not exists queue_entries (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id),
  appointment_id uuid references appointments(id),
  status text not null default 'waiting' check (status in ('waiting','in_progress','done','skipped')),
  checked_in_by uuid references profiles(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_queue_entries_status_created on queue_entries(status, created_at);

alter table queue_entries enable row level security;

-- زي المواعيد بالظبط: أي موظف فعّال (دكتور أو سكرتيرة) يقدر يشوف ويدير
-- الطابور بالكامل — التقييد على مين بالظبط يضغط "ابدأ" بيتعمل في الكود
-- (requireDoctor) مش في الـ RLS، لإن الاتنين محتاجين يشوفوا نفس الشاشة
create policy "staff_all_queue" on queue_entries for all using (is_staff()) with check (is_staff());

-- ============================================================
-- start_queue_entry: الدكتور بس (اتأكد في الكود) بيقدر يبدأ عيان.
-- الدالة دي بتتأكد إنه مفيش عيان تاني "in_progress" في نفس اللحظة،
-- عشان مايحصلش لبس لو حد ضغط "ابدأ" مرتين بسرعة على شاشتين مختلفين
-- ============================================================
create or replace function start_queue_entry(p_entry_id uuid) returns queue_entries
language plpgsql
security definer
as $$
declare
  v_entry queue_entries%rowtype;
  v_in_progress_count int;
begin
  if not is_staff() then
    raise exception 'غير مصرح لك';
  end if;

  select count(*) into v_in_progress_count from queue_entries where status = 'in_progress';
  if v_in_progress_count > 0 then
    raise exception 'فيه عيان تاني في الكشف دلوقتي، خلّص معاه الأول';
  end if;

  update queue_entries
  set status = 'in_progress', started_at = now()
  where id = p_entry_id and status = 'waiting'
  returning * into v_entry;

  if v_entry.id is null then
    raise exception 'العيان مش في حالة انتظار';
  end if;

  return v_entry;
end;
$$;
