-- ============================================================
-- Migration 0016: تشديدات أخيرة قبل التسليم
-- الهدف: نقفل 3 ثغرات على مستوى الداتابيز نفسها (مش بس الكود)
-- عشان تفضل الحماية موجودة حتى لو حد استخدم الـ API مباشرة.
-- كل حاجة هنا "إضافية" بس (additive) ومش بتغيّر أي سلوك متوقّع
-- للاستخدام الطبيعي للسيستم.
-- ============================================================


-- ------------------------------------------------------------
-- 1) منع الكمية السالبة في المخزون على مستوى الداتابيز
-- ------------------------------------------------------------

-- دفاعي: لو (نادرًا جدًا) فيه صنف كميته سالبة أصلاً قبل الفيكس ده،
-- نرجّعها 0 قبل ما نضيف القيد، عشان الـ migration ماتفشلش.
update inventory_items set quantity = 0 where quantity < 0;

alter table inventory_items
  add constraint inventory_items_quantity_nonneg check (quantity >= 0);


-- ------------------------------------------------------------
-- 2) create_invoice: قفل صفوف المخزون وقت التحقق (مش بس قراءتها)
--    + رفض أي دفعة أولى أكبر من إجمالي الفاتورة
-- ------------------------------------------------------------
-- المشكلة اللي كانت موجودة: التحقق من كفاية المخزون كان بيقرا
-- الكمية الحالية من غير ما يقفل الصفوف، فلو فاتورتين اتعملوا في
-- نفس اللحظة تقريبًا على نفس الصنف، الاتنين ممكن يعدّوا التحقق
-- ويوصلوا لكمية سالبة فعليًا. دلوقتي بنقفل صفوف المخزون المعنية
-- (FOR UPDATE) الأول، فأي عملية تانية على نفس الصنف تستنى لحد ما
-- الأولى تخلص، والقيد اللي فوق (رقم 1) بيبقى خط دفاع أخير برضه.

create or replace function create_invoice(
  p_patient_id uuid,
  p_doctor_id uuid,
  p_created_by uuid,
  p_paid_amount numeric,
  p_notes text,
  p_items jsonb
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

  -- نقفل كل صفوف المخزون المعنية بالفاتورة دي الأول (FOR UPDATE)
  -- قبل أي تحقق أو خصم، عشان نمنع أي تعارض مع فاتورة تانية بتتعمل
  -- في نفس اللحظة على نفس الأصناف
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

  -- تحقق: نجمع إجمالي المطلوب من كل صنف مخزون عبر كل بنود
  -- الفاتورة (لو نفس الصنف اتستخدم في أكتر من بند)، ونقارنه بالمتاح
  -- (دلوقتي الصفوف دي مقفولة فعلاً، فالقراءة هنا مضمونة ومحدّثة)
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

  insert into invoices (patient_id, doctor_id, created_by, total_amount, paid_amount, status, notes)
  values (p_patient_id, p_doctor_id, p_created_by, v_total, p_paid_amount, v_status, p_notes)
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


-- ------------------------------------------------------------
-- 3) طابور الانتظار: تقييد حقيقي على مستوى الداتابيز
-- ------------------------------------------------------------
-- المشكلة: صلاحية queue_entries كانت "for all" لأي موظف فعّال،
-- والقيود (الدكتور بس يبدأ/يخلّص كشف، وعيان واحد بس in_progress)
-- كانت متطبّقة في كود التطبيق بس. أي حد عنده session صالحة يقدر
-- يستخدم الـ API مباشرة ويتخطى القيود دي. دلوقتي بنضيفهم كـ:
--   أ) trigger يمنع أي حد غير الدكتور من تحويل الحالة لـ
--      in_progress أو done، حتى لو اتعمل update مباشر على الجدول
--   ب) unique index يمنع أكتر من عيان يبقى in_progress في نفس الوقت
--      (بيشتغل حتى لو حصل تعارض بين طلبين في نفس اللحظة بالظبط)

-- دفاعي: لو حاليًا (نادرًا) فيه أكتر من صف in_progress، نرجّع كل
-- واحد فيهم إلا الأحدث بدأ لحالة "waiting"، عشان الـ index الجديد
-- مايفشلش وقت الإنشاء
with dups as (
  select id, row_number() over (partition by status order by started_at desc nulls last) as rn
  from queue_entries
  where status = 'in_progress'
)
update queue_entries
set status = 'waiting', started_at = null
where id in (select id from dups where rn > 1);

create unique index if not exists idx_queue_only_one_in_progress
  on queue_entries ((status))
  where status = 'in_progress';

create or replace function enforce_queue_status_transition()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status is distinct from old.status
     and new.status in ('in_progress', 'done')
     and not is_doctor() then
    raise exception 'بس الدكتور يقدر يبدأ أو يخلّص كشف عيان في الطابور';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_queue_status_transition on queue_entries;
create trigger trg_enforce_queue_status_transition
  before update on queue_entries
  for each row
  execute function enforce_queue_status_transition();
