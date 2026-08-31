-- إخفاء مؤقت لتنبيه "أصناف قربت تخلص" في الهوم سكرين
-- بنسجل تاريخ آخر مرة تم فيها ضغط "تجاهل" على الصنف، وبنخفي التنبيه
-- بتاعه لمدة يوم بعدها (لو لسه الكمية قليلة، هيظهر تاني تلقائيًا).
-- الـ RLS الموجودة أصلاً على inventory_items (staff_all_inventory) كافية
-- هنا، مفيش داعي لأي policy جديدة.

alter table inventory_items
  add column if not exists low_stock_dismissed_until timestamptz;
