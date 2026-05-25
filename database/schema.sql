-- Core table and trigger schema for a fresh Supabase database.
-- For a one-shot SQL Editor migration, use database/auth.sql instead.

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
  assignment_type text not null check (assignment_type in ('listening_recording', 'listening', 'writing')),
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
  item_type text not null check (item_type in ('listening_recording', 'listening', 'writing_prompt')),
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

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists app_users_set_updated_at on app_users;
create trigger app_users_set_updated_at before update on app_users for each row execute function set_updated_at();
drop trigger if exists teachers_set_updated_at on teachers;
create trigger teachers_set_updated_at before update on teachers for each row execute function set_updated_at();
drop trigger if exists students_set_updated_at on students;
create trigger students_set_updated_at before update on students for each row execute function set_updated_at();
drop trigger if exists classes_set_updated_at on classes;
create trigger classes_set_updated_at before update on classes for each row execute function set_updated_at();
drop trigger if exists class_schedule_days_set_updated_at on class_schedule_days;
create trigger class_schedule_days_set_updated_at before update on class_schedule_days for each row execute function set_updated_at();
drop trigger if exists assignments_set_updated_at on assignments;
create trigger assignments_set_updated_at before update on assignments for each row execute function set_updated_at();
drop trigger if exists assignment_items_set_updated_at on assignment_items;
create trigger assignment_items_set_updated_at before update on assignment_items for each row execute function set_updated_at();
drop trigger if exists assignment_targets_set_updated_at on assignment_targets;
create trigger assignment_targets_set_updated_at before update on assignment_targets for each row execute function set_updated_at();
drop trigger if exists submissions_set_updated_at on submissions;
create trigger submissions_set_updated_at before update on submissions for each row execute function set_updated_at();
drop trigger if exists submission_items_set_updated_at on submission_items;
create trigger submission_items_set_updated_at before update on submission_items for each row execute function set_updated_at();
drop trigger if exists teacher_feedback_set_updated_at on teacher_feedback;
create trigger teacher_feedback_set_updated_at before update on teacher_feedback for each row execute function set_updated_at();
