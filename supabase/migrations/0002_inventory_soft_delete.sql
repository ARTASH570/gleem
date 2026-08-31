-- إضافة عمود is_active لجدول المخزون
-- بدل ما نمسح الصنف فعليًا (وده ممكن يكسر سجل الفواتير القديمة اللي استخدمته)
-- بنعمله "غير نشط" فبيختفي من القوائم بس بياناته وسجله بيفضلوا محفوظين

alter table inventory_items
  add column if not exists is_active boolean not null default true;
