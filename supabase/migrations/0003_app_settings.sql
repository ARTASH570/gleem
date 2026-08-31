-- جدول إعدادات واحد بس (صف واحد دايمًا) بيتتبع آخر مرة اتحمّلت فيها نسخة Excel احتياطية

create table if not exists app_settings (
  id boolean primary key default true,
  last_backup_at timestamptz,
  constraint app_settings_single_row check (id)
);

insert into app_settings (id) values (true) on conflict do nothing;

alter table app_settings enable row level security;

create policy "doctor_all_settings" on app_settings for all using (is_doctor()) with check (is_doctor());
