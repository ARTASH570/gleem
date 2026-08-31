-- ============================================================
-- payments: سجل تفصيلي لكل دفعة على أي فاتورة (بدل ما يكون بس رقم
-- متراكم paid_amount من غير أي تفاصيل). كل دفعة بتتسجل هنا بطريقتها
-- (نقدي/تحويل)، والعمود paid_amount في invoices فاضل زي ما هو
-- (بيتحدث تلقائي من نفس الدوال) عشان مايتكسرش أي حساب موجود.
-- ============================================================

create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash','transfer')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table payments enable row level security;

-- أي موظف فعّال يقدر يشوف ويسجل دفعات (نفس صلاحيات الفواتير للموظفين)،
-- بس مفيش سياسة update/delete خالص — يعني السجل ده append-only زي سجل
-- الأوديت، محدش يقدر يعدل أو يمسح دفعة اتسجلت
create policy "staff_select_payments" on payments for select using (is_staff());
create policy "staff_insert_payments" on payments for insert with check (is_staff());

-- ============================================================
-- تحديث record_payment (من 0012) عشان تسجّل طريقة الدفع كمان في
-- جدول payments، مش بس تحدّث paid_amount على الفاتورة
-- ============================================================
drop function if exists record_payment(uuid, numeric);

create or replace function record_payment(
  p_invoice_id uuid,
  p_add_payment numeric,
  p_method text default 'cash'
) returns invoices
language plpgsql
security definer
as $$
declare
  v_invoice invoices%rowtype;
  v_remaining numeric;
  v_new_paid numeric;
  v_status text;
begin
  if not is_staff() then
    raise exception 'غير مصرح لك بتحصيل الدفعات';
  end if;

  if p_method not in ('cash', 'transfer') then
    raise exception 'طريقة دفع غير معروفة';
  end if;

  select * into v_invoice from invoices where id = p_invoice_id for update;

  if v_invoice.id is null then
    raise exception 'الفاتورة غير موجودة';
  end if;

  if v_invoice.status = 'cancelled' then
    raise exception 'الفاتورة ملغاة، مايمكنش تحصيل دفعة عليها';
  end if;

  if p_add_payment is null or p_add_payment <= 0 then
    raise exception 'المبلغ المدخل غير صحيح';
  end if;

  v_remaining := v_invoice.total_amount - v_invoice.paid_amount;

  if p_add_payment > v_remaining then
    raise exception 'المبلغ المدخل (%) أكبر من المتبقي على الفاتورة (%)', p_add_payment, v_remaining;
  end if;

  v_new_paid := v_invoice.paid_amount + p_add_payment;
  v_status := case when v_new_paid >= v_invoice.total_amount then 'paid' else 'partial' end;

  update invoices set paid_amount = v_new_paid, status = v_status
  where id = p_invoice_id
  returning * into v_invoice;

  insert into payments (invoice_id, amount, method, created_by)
  values (p_invoice_id, p_add_payment, p_method, auth.uid());

  return v_invoice;
end;
$$;

-- ============================================================
-- مصدر الحجز: الموعد جه من الواتساب ولا من الريسبشن مباشرة
-- ============================================================
alter table appointments
  add column if not exists booking_source text not null default 'reception'
  check (booking_source in ('reception', 'whatsapp'));
