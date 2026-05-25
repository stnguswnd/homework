create table if not exists app_users (
  id uuid primary key,
  username text not null unique,
  password_hash text not null,
  role text not null check (role in ('teacher', 'parent', 'student')),
  display_name text not null,
  linked_student_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app_users add column if not exists updated_at timestamptz not null default now();
alter table app_users add column if not exists linked_student_id text;

create table if not exists auth_sessions (
  id text primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists teachers (
  id text primary key,
  app_user_id uuid unique references app_users(id) on delete set null,
  email text not null unique,
  display_name text not null,
  role text not null default 'teacher' check (role in ('teacher', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists students (
  id text primary key,
  app_user_id uuid unique references app_users(id) on delete set null,
  teacher_id text not null references teachers(id) on delete cascade,
  student_login_id text,
  student_code text,
  password_hash text,
  name text not null,
  school_name text,
  grade text,
  avatar_key text not null default 'robot',
  memo text,
  parent_id text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table students add column if not exists student_login_id text;
alter table students add column if not exists password_hash text;
alter table students add column if not exists student_code text;
alter table students alter column teacher_id set not null;
alter table students alter column avatar_key set default 'robot';
alter table students alter column status set default 'active';

update students
set student_login_id = coalesce(student_login_id, student_code)
where student_login_id is null;

update students
set password_hash = 'legacy-unusable'
where password_hash is null;

alter table students alter column student_login_id set not null;
alter table students alter column password_hash set not null;

alter table students drop constraint if exists students_student_code_key;
alter table students drop constraint if exists students_teacher_student_login_unique;
alter table students add constraint students_teacher_student_login_unique unique (teacher_id, student_login_id);

create unique index if not exists students_teacher_student_code_unique
  on students(teacher_id, student_code)
  where student_code is not null;

alter table app_users
  drop constraint if exists app_users_linked_student_id_fkey;

update app_users
set linked_student_id = null
where linked_student_id is not null
  and not exists (
    select 1
    from students
    where students.id = app_users.linked_student_id
  );

alter table app_users
  add constraint app_users_linked_student_id_fkey
  foreign key (linked_student_id) references students(id) on delete set null;

create table if not exists classes (
  id text primary key,
  teacher_id text not null references teachers(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists classes_teacher_name_unique
  on classes(teacher_id, lower(name));

create table if not exists class_memberships (
  id text primary key,
  class_id text not null references classes(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create table if not exists class_schedule_days (
  id text primary key,
  class_id text not null references classes(id) on delete cascade,
  date date not null,
  has_class boolean not null default true,
  start_time time,
  end_time time,
  book_title text,
  progress_title text,
  progress_memo text,
  next_prep text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, date)
);

create table if not exists assignments (
  id text primary key,
  teacher_id text not null references teachers(id) on delete cascade,
  class_id text references classes(id) on delete set null,
  schedule_day_id text references class_schedule_days(id) on delete set null,
  title text not null,
  description text,
  assignment_type text not null check (
    assignment_type in (
      'listening_recording',
      'image_speaking',
      'sentence_shadowing',
      'free_speaking',
      'writing',
      'quiz',
      'vocabulary',
      'general'
    )
  ),
  assignment_subject text not null default 'AL',
  image_url text,
  image_storage_path text,
  image_file_name text,
  assigned_date date,
  due_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table assignments alter column class_id drop not null;
alter table assignments add column if not exists image_file_name text;
alter table assignments add column if not exists assignment_subject text not null default 'AL';

update assignments
set assignment_subject = case
  when assignment_type = 'vocabulary' then 'Phonics'
  when assignment_type in ('sentence_shadowing', 'image_speaking') then 'AR'
  else 'AL'
end
where assignment_subject is null or assignment_subject = 'AL';

create table if not exists assignment_items (
  id text primary key,
  assignment_id text not null references assignments(id) on delete cascade,
  item_type text not null check (item_type in ('listening_recording', 'image_speaking', 'sentence_shadowing', 'free_speaking', 'writing_prompt', 'quiz_question')),
  title text,
  passage_text text not null,
  audio_url text,
  audio_file_name text,
  audio_storage_path text,
  image_url text,
  image_storage_path text,
  order_index int not null,
  min_recording_sec int not null default 0,
  max_recording_sec int not null default 120,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, order_index)
);

alter table assignment_items drop constraint if exists assignment_items_item_type_check;
alter table assignment_items
  add constraint assignment_items_item_type_check
  check (item_type in ('listening_recording', 'image_speaking', 'sentence_shadowing', 'free_speaking', 'writing_prompt', 'quiz_question'));

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

drop table if exists assignment_templates;

create table if not exists assignment_targets (
  id text primary key,
  assignment_id text not null references assignments(id) on delete cascade,
  class_id text references classes(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned', 'submitted', 'late', 'excused')),
  due_at timestamptz,
  submitted_at timestamptz,
  reviewed boolean not null default false,
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

alter table assignment_targets add column if not exists due_at timestamptz;
alter table assignment_targets add column if not exists class_id text references classes(id) on delete cascade;

update assignment_targets at
set class_id = a.class_id
from assignments a
where at.assignment_id = a.id
  and at.class_id is null
  and a.class_id is not null;

create table if not exists submissions (
  id text primary key,
  assignment_id text not null references assignments(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  assignment_target_id text references assignment_targets(id) on delete set null,
  status text not null default 'not_submitted' check (status in ('not_submitted', 'submitted', 'reviewed', 'returned')),
  submitted_at timestamptz,
  teacher_comment text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create table if not exists submission_items (
  id text primary key,
  submission_id text not null references submissions(id) on delete cascade,
  assignment_item_id text not null references assignment_items(id) on delete cascade,
  recording_url text,
  recording_file_name text,
  recording_mime_type text,
  recording_duration_sec int,
  file_size_bytes bigint,
  recording_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, assignment_item_id)
);

create table if not exists teacher_feedback (
  id text primary key,
  submission_id text not null unique references submissions(id) on delete cascade,
  teacher_id text not null references teachers(id) on delete cascade,
  comment text,
  score int check (score is null or (score >= 0 and score <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists certificates (
  id text primary key,
  student_id text not null references students(id) on delete cascade,
  title text not null,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists auth_sessions_user_id_idx on auth_sessions(user_id);
create index if not exists auth_sessions_expires_at_idx on auth_sessions(expires_at);
create index if not exists students_teacher_id_idx on students(teacher_id);
create index if not exists class_memberships_student_id_idx on class_memberships(student_id);
create index if not exists assignments_class_id_idx on assignments(class_id);
create index if not exists assignment_targets_student_id_idx on assignment_targets(student_id);
create index if not exists assignment_targets_class_id_idx on assignment_targets(class_id);
create index if not exists submissions_student_id_idx on submissions(student_id);

create or replace view class_list_view as
select
  c.id,
  c.teacher_id,
  c.name,
  c.description,
  c.status,
  count(cm.student_id)::int as student_count,
  c.created_at,
  c.updated_at
from classes c
left join class_memberships cm on cm.class_id = c.id
group by c.id;

drop view if exists student_list_view;

create or replace view student_list_view as
select
  s.id,
  s.teacher_id,
  coalesce(s.student_login_id, s.student_code) as student_code,
  s.student_login_id,
  s.name,
  s.school_name,
  s.grade,
  s.avatar_key,
  s.memo,
  s.parent_id,
  s.status,
  coalesce(array_remove(array_agg(c.id order by c.name), null), array[]::text[]) as class_ids,
  coalesce(array_remove(array_agg(c.name order by c.name), null), array[]::text[]) as class_names,
  s.created_at,
  s.updated_at
from students s
left join class_memberships cm on cm.student_id = s.id
left join classes c on c.id = cm.class_id
group by s.id;

create or replace view student_learning_history_view as
select
  concat('history-', at.assignment_id, '-', at.student_id) as id,
  at.student_id,
  coalesce(at.submitted_at, at.due_at, a.due_at, a.created_at)::date as date,
  a.title as assignment_title,
  a.assignment_type,
  c.name as class_name,
  case
    when sub.id is not null then 'submitted'
    when coalesce(at.due_at, a.due_at) is not null and coalesce(at.due_at, a.due_at) < now() then 'late'
    else 'not_submitted'
  end as submit_status,
  tf.score,
  case
    when tf.id is not null or sub.status = 'reviewed' or at.reviewed = true then 'reviewed'
    when sub.id is not null then 'pending'
    else 'none'
  end as review_status,
  case
    when sub.id is not null then concat('/teacher/submissions/', sub.id)
    else null
  end as detail_href
from assignment_targets at
join assignments a on a.id = at.assignment_id
left join classes c on c.id = at.class_id and c.teacher_id = a.teacher_id
left join submissions sub on sub.assignment_id = a.id and sub.student_id = at.student_id
left join teacher_feedback tf on tf.submission_id = sub.id;
