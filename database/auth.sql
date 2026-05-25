-- New Supabase database schema.
-- This file is safe to paste into the Supabase SQL Editor for a fresh project.
-- Legacy backfill/drop logic lives in database/legacy-backfill.sql and database/drop-legacy.sql.

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
  student_login_id text not null,
  password_hash text not null,
  name text not null,
  school_name text,
  grade text,
  avatar_key text not null default 'robot',
  memo text,
  parent_id text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, student_login_id)
);

alter table app_users
  drop constraint if exists app_users_linked_student_id_fkey;

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
      'listening',
      'writing',
      'vocabulary_example',
      'vocabulary_recording'
    )
  ),
  assignment_subject text not null default 'Phonics',
  image_url text,
  image_storage_path text,
  image_file_name text,
  assigned_date date,
  due_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists assignment_items (
  id text primary key,
  assignment_id text not null references assignments(id) on delete cascade,
  item_type text not null check (
    item_type in (
      'listening_recording',
      'listening',
      'writing_prompt',
      'vocabulary_example',
      'vocabulary_recording'
    )
  ),
  title text,
  passage_text text,
  audio_url text,
  audio_file_name text,
  audio_storage_path text,
  image_url text,
  image_storage_path text,
  order_index int not null,
  min_recording_sec int not null default 0,
  max_recording_sec int not null default 120,
  writing_mode text check (writing_mode in ('picture_description', 'topic_diary')),
  writing_unit text check (writing_unit in ('paragraphs', 'sentences')),
  writing_unit_count integer not null default 4,
  prompt_text text,
  writing_instructions text,
  writing_hint text,
  writing_example text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, order_index)
);

create table if not exists assignment_targets (
  id text primary key,
  assignment_id text not null references assignments(id) on delete cascade,
  class_id text references classes(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned', 'submitted', 'late', 'excused', 'cancelled')),
  due_at timestamptz,
  submitted_at timestamptz,
  reviewed boolean not null default false,
  feedback text,
  cancelled_at timestamptz,
  cancelled_by text references teachers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

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
  original_answer_text text,
  answer_text text,
  ai_corrected_text text,
  ai_feedback text,
  ai_grammar_notes text,
  ai_expression_notes text,
  ai_feedback_raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, assignment_item_id)
);

create table if not exists assignment_vocabulary_items (
  id text primary key,
  assignment_id text not null references assignments(id) on delete cascade,
  word text not null,
  meaning text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, order_index)
);

create table if not exists submission_vocabulary_items (
  id text primary key,
  submission_id text not null references submissions(id) on delete cascade,
  assignment_vocabulary_item_id text not null references assignment_vocabulary_items(id) on delete cascade,
  original_answer_text text,
  ai_corrected_text text,
  ai_feedback text,
  ai_grammar_notes text,
  ai_feedback_raw jsonb,
  revised_answer_text text,
  teacher_comment text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'reviewed', 'returned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, assignment_vocabulary_item_id)
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

create unique index if not exists classes_teacher_name_unique
  on classes(teacher_id, lower(name));

create index if not exists auth_sessions_user_id_idx on auth_sessions(user_id);
create index if not exists auth_sessions_expires_at_idx on auth_sessions(expires_at);
create index if not exists students_teacher_id_idx on students(teacher_id);
create index if not exists class_memberships_student_id_idx on class_memberships(student_id);
create index if not exists assignments_teacher_id_idx on assignments(teacher_id);
create index if not exists assignments_class_id_idx on assignments(class_id);
create index if not exists assignment_targets_student_id_idx on assignment_targets(student_id);
create index if not exists assignment_targets_class_id_idx on assignment_targets(class_id);
create index if not exists idx_assignment_targets_assignment_status on assignment_targets(assignment_id, status);
create index if not exists idx_assignment_targets_assignment_class_status on assignment_targets(assignment_id, class_id, status);
create index if not exists idx_assignment_targets_cancelled_at on assignment_targets(cancelled_at) where status = 'cancelled';
create index if not exists submissions_student_id_idx on submissions(student_id);
create index if not exists submissions_assignment_target_id_idx on submissions(assignment_target_id);
create index if not exists submission_items_submission_id_idx on submission_items(submission_id);

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

create or replace view student_list_view as
select
  s.id,
  s.teacher_id,
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

create or replace view assignment_target_status_view as
select
  at.id as target_id,
  at.assignment_id,
  at.class_id,
  c.name as class_name,
  at.student_id,
  s.name as student_name,
  at.status as target_status,
  at.due_at,
  at.submitted_at as target_submitted_at,
  at.reviewed,
  at.feedback,
  at.cancelled_at,
  at.cancelled_by,
  sub.id as submission_id,
  sub.status as submission_status,
  sub.submitted_at,
  sub.reviewed_at,
  case
    when at.status = 'cancelled' then 'cancelled'
    when sub.id is not null and coalesce(sub.status, 'not_submitted') <> 'not_submitted' then 'submitted'
    when at.status in ('submitted', 'late') then 'submitted'
    else 'not_submitted'
  end as computed_submission_status,
  case
    when at.status = 'cancelled' then false
    when sub.id is not null and coalesce(sub.status, 'not_submitted') <> 'not_submitted' then false
    when at.status in ('submitted', 'late') then false
    else true
  end as cancellable
from assignment_targets at
join assignments a on a.id = at.assignment_id
join students s on s.id = at.student_id
left join classes c on c.id = at.class_id
left join submissions sub on sub.assignment_id = at.assignment_id and sub.student_id = at.student_id;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists app_users_set_updated_at on app_users;
create trigger app_users_set_updated_at
before update on app_users
for each row execute function set_updated_at();

drop trigger if exists teachers_set_updated_at on teachers;
create trigger teachers_set_updated_at
before update on teachers
for each row execute function set_updated_at();

drop trigger if exists students_set_updated_at on students;
create trigger students_set_updated_at
before update on students
for each row execute function set_updated_at();

drop trigger if exists classes_set_updated_at on classes;
create trigger classes_set_updated_at
before update on classes
for each row execute function set_updated_at();

drop trigger if exists class_schedule_days_set_updated_at on class_schedule_days;
create trigger class_schedule_days_set_updated_at
before update on class_schedule_days
for each row execute function set_updated_at();

drop trigger if exists assignments_set_updated_at on assignments;
create trigger assignments_set_updated_at
before update on assignments
for each row execute function set_updated_at();

drop trigger if exists assignment_items_set_updated_at on assignment_items;
create trigger assignment_items_set_updated_at
before update on assignment_items
for each row execute function set_updated_at();

drop trigger if exists assignment_targets_set_updated_at on assignment_targets;
create trigger assignment_targets_set_updated_at
before update on assignment_targets
for each row execute function set_updated_at();

drop trigger if exists submissions_set_updated_at on submissions;
create trigger submissions_set_updated_at
before update on submissions
for each row execute function set_updated_at();

drop trigger if exists submission_items_set_updated_at on submission_items;
create trigger submission_items_set_updated_at
before update on submission_items
for each row execute function set_updated_at();

drop trigger if exists assignment_vocabulary_items_set_updated_at on assignment_vocabulary_items;
create trigger assignment_vocabulary_items_set_updated_at
before update on assignment_vocabulary_items
for each row execute function set_updated_at();

drop trigger if exists submission_vocabulary_items_set_updated_at on submission_vocabulary_items;
create trigger submission_vocabulary_items_set_updated_at
before update on submission_vocabulary_items
for each row execute function set_updated_at();

drop trigger if exists teacher_feedback_set_updated_at on teacher_feedback;
create trigger teacher_feedback_set_updated_at
before update on teacher_feedback
for each row execute function set_updated_at();
