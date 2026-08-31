-- ============================================================
-- تحديث create_invoice: التحقق من كفاية المخزون قبل الخصم
-- قبل كده، الدالة كانت بتخصم المخزون من غير ما تتأكد إن الكمية
-- كافية، فكان ممكن تفضل تعمل فواتير لحد ما الكمية تروح لناقص من
-- غير أي تنبيه. دلوقتي بتتأكد الأول (بتجمع الطلب على كل صنف من كل
-- بنود الفاتورة مع بعض)، ولو مفيش كمية كافية، ترفض العملية كلها
-- برسالة واضحة فيها اسم الصنف والمتاح والمطلوب.
-- ============================================================

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
begin
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

  -- تحقق مسبق: نجمع إجمالي المطلوب من كل صنف مخزون عبر كل بنود
  -- الفاتورة (لو نفس الصنف اتستخدم في أكتر من بند)، ونقارنه بالمتاح
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
