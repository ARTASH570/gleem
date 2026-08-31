-- ============================================================
-- حساب الأدمن: صلاحيات + إخفاء عن الدكتور + وضع الصيانة
-- ============================================================

-- هل المستخدم الحالي أدمن؟
create or replace function is_admin() returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

-- نضيّق صلاحيات الدكتور على جدول profiles عشان يستثني صفوف الأدمن
-- تمامًا (مش بس إخفاء في الواجهة — على مستوى قاعدة البيانات نفسها).
-- الأدمن ليه policy منفصلة بصلاحية كاملة على نفسه وعلى بروفايلات
-- الأدمن التانية لو وجدت.
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select
  using (auth.uid() = id or is_admin() or (is_doctor() and role <> 'admin'));

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update
  using (auth.uid() = id or is_admin() or (is_doctor() and role <> 'admin'));

drop policy if exists "profiles_doctor_all" on profiles;
create policy "profiles_doctor_all" on profiles for all
  using (is_doctor() and role <> 'admin')
  with check (is_doctor() and role <> 'admin');

create policy "profiles_admin_all" on profiles for all
  using (is_admin())
  with check (is_admin());

-- وضع الصيانة: عمود جديد في app_settings، وبس الأدمن يقدر يغيّره.
-- أي موظف فعّال (دكتور/سكرتيرة/أدمن) يقدر يقرأه عادي (محتاجينه في كل
-- تحميل صفحة عشان نعرف نوريه شاشة الصيانة ولا لأ)
alter table app_settings add column if not exists maintenance_mode boolean not null default false;

drop policy if exists "doctor_all_settings" on app_settings;

create policy "settings_select" on app_settings for select using (is_staff());
create policy "settings_admin_update" on app_settings for update using (is_admin()) with check (is_admin());

-- ============================================================
-- إنشاء حساب الأدمن (يدوي، مرة واحدة بس):
-- 1) Supabase Dashboard → Authentication → Add user (إيميل + باسورد)
-- 2) شغّل السطر ده بعد ما تحط الـ UID بتاع اليوزر اللي اتعمل:
--
-- insert into profiles (id, full_name, role, is_active)
-- values ('UID-هنا', 'Admin', 'admin', true);
-- ============================================================
