-- Optional cleanup for existing local/legacy databases only.
-- Run after database/legacy-backfill.sql has completed successfully.
-- Do not run this on a fresh Supabase database.

alter table students drop constraint if exists students_student_code_key;
drop index if exists students_teacher_student_code_unique;
drop view if exists student_list_view;
alter table students drop column if exists student_code;

drop table if exists assignment_templates;
