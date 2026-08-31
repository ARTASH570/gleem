-- ============================================================
-- record_payment: تحصيل دفعة على فاتورة (أي موظف فعّال، مش دكتور بس)
-- ============================================================
-- ليه الدالة دي محتاجة:
-- الـ policy "doctor_update_invoices" (من 0001_init.sql) بتقصر UPDATE
-- على جدول invoices على الدكتور بس. زرار "تحصيل دفعة" في صفحة الفاتورة
-- ظاهر لأي موظف (بما فيهم السكرتيرة)، فلو سكرتيرة ضغطت عليه كان الـ
-- update بيترفض بهدوء من الـ RLS (من غير أي error)، يعني الفلوس ما
-- كانتش بتتسجل فعليًا مع إن الشاشة بترجع عادي وكأن كل حاجة تمام.
--
-- الدالة دي security definer (زي create_invoice و cancel_invoice)
-- فبتقدر تعدل الفاتورة بغض النظر عن دور المستخدم، لكن بتتأكد بنفسها
-- إن المستخدم موظف فعّال (is_staff())، وبتقفل الصف (for update) عشان
-- تمنع أي تعارض لو حصل تحصيل دفعتين في نفس اللحظة بالظبط، وبتتأكد إن
-- المبلغ المدخل مايتخطاش المتبقي فعليًا في الفاتورة.
-- ============================================================

create or replace function record_payment(
  p_invoice_id uuid,
  p_add_payment numeric
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

  return v_invoice;
end;
$$;

-- ============================================================
-- restock_inventory_item: توريد كمية لصنف مخزون + تسجيل الحركة
-- ============================================================
-- نفس فكرة اللي فوق: بدل ما الكود يقرا الكمية الحالية ويحسب الجديدة
-- ويكتبها (احتمال ضئيل لتعارض لو حصل توريدين في نفس اللحظة بالظبط)،
-- الدالة دي بتعمل القفل والتحديث والتسجيل في inventory_transactions
-- كلهم جوه نفس الـ transaction وبقفل على الصف (for update).
-- ============================================================

create or replace function restock_inventory_item(
  p_item_id uuid,
  p_add_qty numeric,
  p_actor uuid
) returns inventory_items
language plpgsql
security definer
as $$
declare
  v_item inventory_items%rowtype;
begin
  if not is_staff() then
    raise exception 'غير مصرح لك بتوريد المخزون';
  end if;

  if p_add_qty is null or p_add_qty <= 0 then
    raise exception 'الكمية المدخلة غير صحيحة';
  end if;

  select * into v_item from inventory_items where id = p_item_id for update;

  if v_item.id is null then
    raise exception 'الصنف غير موجود';
  end if;

  update inventory_items
  set quantity = quantity + p_add_qty, updated_at = now()
  where id = p_item_id
  returning * into v_item;

  insert into inventory_transactions (inventory_item_id, change_qty, reason, created_by)
  values (p_item_id, p_add_qty, 'restock', p_actor);

  return v_item;
end;
$$;
