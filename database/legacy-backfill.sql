-- Optional migration for existing local/legacy databases only.
-- Do not run this on a fresh Supabase database.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'students'
      and column_name = 'student_code'
  ) then
    update students
    set student_login_id = student_code
    where student_login_id is null
      and student_code is not null;
  end if;
end $$;

update students
set password_hash = 'legacy-unusable'
where password_hash is null;

do $$
begin
  if to_regclass('public.assignment_templates') is not null then
    insert into assignments (
      id, teacher_id, title, description, assignment_type, image_url, image_storage_path, image_file_name, status, updated_at
    )
    select
      t.id,
      t.teacher_id,
      t.title,
      t.description,
      t.assignment_type,
      t.image_url,
      t.image_storage_path,
      t.image_file_name,
      'draft',
      now()
    from assignment_templates t
    on conflict (id) do update set
      title = excluded.title,
      description = excluded.description,
      assignment_type = excluded.assignment_type,
      image_url = excluded.image_url,
      image_storage_path = excluded.image_storage_path,
      image_file_name = excluded.image_file_name,
      updated_at = now();

    insert into assignment_items (
      id, assignment_id, item_type, title, passage_text, audio_url, audio_storage_path,
      audio_file_name, order_index, min_recording_sec, max_recording_sec
    )
    select
      concat(t.id, '-item-1'),
      t.id,
      case
        when t.assignment_type in ('image_speaking', 'sentence_shadowing', 'free_speaking', 'listening_recording') then t.assignment_type
        else 'listening_recording'
      end,
      t.passage_title,
      coalesce(t.passage_text, ''),
      t.audio_url,
      t.audio_storage_path,
      t.audio_file_name,
      1,
      t.min_recording_sec,
      t.max_recording_sec
    from assignment_templates t
    on conflict (assignment_id, order_index) do update set
      item_type = excluded.item_type,
      title = excluded.title,
      passage_text = excluded.passage_text,
      audio_url = excluded.audio_url,
      audio_storage_path = excluded.audio_storage_path,
      audio_file_name = excluded.audio_file_name,
      min_recording_sec = excluded.min_recording_sec,
      max_recording_sec = excluded.max_recording_sec,
      updated_at = now();
  end if;
end $$;

update assignment_targets at
set class_id = a.class_id
from assignments a
where at.assignment_id = a.id
  and at.class_id is null
  and a.class_id is not null;

update submissions sub
set assignment_target_id = at.id
from assignment_targets at
where at.assignment_id = sub.assignment_id
  and at.student_id = sub.student_id
  and sub.assignment_target_id is null;
