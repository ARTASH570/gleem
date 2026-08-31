-- ============================================================
-- إلغاء الفاتورة (دكتور بس)
-- بيرجع أي مخزون اتخصم بسبب الفاتورة دي، ويسجل حركة عكسية في
-- inventory_transactions (عشان السجل يفضل واضح ومتتبّع)، وبعدين
-- يغيّر حالة الفاتورة لـ 'cancelled'. كله جوه transaction واحدة.
-- ============================================================

-- لازم نضيف 'cancelled' لقائمة الحالات المسموحة الأول
alter table invoices drop constraint if exists invoices_status_check;
alter table invoices add constraint invoices_status_check
  check (status in ('unpaid','partial','paid','cancelled'));

create or replace function cancel_invoice(
  p_invoice_id uuid,
  p_cancelled_by uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_status text;
  v_tx record;
begin
  select status into v_status from invoices where id = p_invoice_id for update;

  if v_status is null then
    raise exception 'الفاتورة غير موجودة';
  end if;

  if v_status = 'cancelled' then
    raise exception 'الفاتورة ملغاة بالفعل';
  end if;

  -- رجّع أي مخزون اتخصم بسبب بنود الفاتورة دي
  for v_tx in
    select * from inventory_transactions
    where reference_invoice_id = p_invoice_id and reason = 'invoice'
  loop
    update inventory_items
    set quantity = quantity - v_tx.change_qty, updated_at = now()
    where id = v_tx.inventory_item_id;

    insert into inventory_transactions (inventory_item_id, change_qty, reason, reference_invoice_id, created_by)
    values (v_tx.inventory_item_id, -v_tx.change_qty, 'cancellation', p_invoice_id, p_cancelled_by);
  end loop;

  update invoices set status = 'cancelled' where id = p_invoice_id;
end;
$$;
