-- ============================================================
-- بحث تقريبي بالاسم (fuzzy) لاكتشاف عيانين متشابهين في الاسم
-- حتى لو التليفون مختلف أو مكتوبش (زي غلطة إملائية في الاسم مثلاً).
-- بيستخدم pg_trgm اللي اتفعّل في migration 0005.
-- ============================================================

create or replace function find_similar_patients(p_name text, p_threshold real default 0.35, p_limit int default 3)
returns table (id uuid, full_name text, phone text, similarity real)
language sql
stable
as $$
  select id, full_name, phone, similarity(full_name, p_name) as similarity
  from patients
  where similarity(full_name, p_name) > p_threshold
  order by similarity desc
  limit p_limit;
$$;
