-- Calendar, notice, and test extension schema.
-- DDL only. Safe to run on an empty Supabase database before any teacher/demo data exists.

create table if not exists class_calendar_events (
  id text primary key,
  teacher_id text not null references teachers(id) on delete cascade,
  class_id text not null references classes(id) on delete cascade,
  schedule_day_id text references class_schedule_days(id) on delete set null,
  event_type text not null check (event_type in ('test', 'cancelled', 'makeup', 'notice', 'class', 'etc')),
  title text not null,
  description text,
  event_date date not null,
  start_time time,
  end_time time,
  status text not null default 'active' check (status in ('active', 'cancelled', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notices (
  id text primary key,
  teacher_id text not null references teachers(id) on delete cascade,
  title text not null,
  content text not null,
  image_url text,
  image_storage_path text,
  image_file_name text,
  status text not null default 'published' check (status in ('draft', 'published', 'hidden', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notice_targets (
  id text primary key,
  notice_id text not null references notices(id) on delete cascade,
  class_id text references classes(id) on delete cascade,
  student_id text references students(id) on delete cascade,
  target_type text not null check (target_type in ('all', 'class', 'student')),
  created_at timestamptz not null default now(),
  check (
    (target_type = 'all' and class_id is null and student_id is null)
    or (target_type = 'class' and class_id is not null and student_id is null)
    or (target_type = 'student' and student_id is not null)
  )
);

create table if not exists tests (
  id text primary key,
  teacher_id text not null references teachers(id) on delete cascade,
  class_id text references classes(id) on delete cascade,
  calendar_event_id text references class_calendar_events(id) on delete set null,
  title text not null,
  subject text not null,
  test_date date not null,
  start_time time,
  end_time time,
  scope text,
  description text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists test_results (
  id text primary key,
  test_id text not null references tests(id) on delete cascade,
  teacher_id text not null references teachers(id) on delete cascade,
  class_id text references classes(id) on delete set null,
  student_id text not null references students(id) on delete cascade,
  score numeric(5,2),
  max_score numeric(5,2) not null default 100,
  result text not null check (result in ('PASS', 'NonPASS')),
  teacher_memo text,
  taken_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (test_id, student_id)
);

create index if not exists class_calendar_events_teacher_date_idx on class_calendar_events(teacher_id, event_date);
create index if not exists class_calendar_events_class_date_idx on class_calendar_events(class_id, event_date);
create index if not exists notices_teacher_status_idx on notices(teacher_id, status, published_at desc);
create index if not exists notice_targets_notice_id_idx on notice_targets(notice_id);
create index if not exists notice_targets_class_id_idx on notice_targets(class_id);
create index if not exists notice_targets_student_id_idx on notice_targets(student_id);
create index if not exists tests_teacher_date_idx on tests(teacher_id, test_date);
create index if not exists tests_class_date_idx on tests(class_id, test_date);
create index if not exists test_results_student_id_idx on test_results(student_id);
create index if not exists test_results_teacher_class_idx on test_results(teacher_id, class_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists class_calendar_events_set_updated_at on class_calendar_events;
create trigger class_calendar_events_set_updated_at before update on class_calendar_events for each row execute function set_updated_at();

drop trigger if exists notices_set_updated_at on notices;
create trigger notices_set_updated_at before update on notices for each row execute function set_updated_at();

drop trigger if exists tests_set_updated_at on tests;
create trigger tests_set_updated_at before update on tests for each row execute function set_updated_at();

drop trigger if exists test_results_set_updated_at on test_results;
create trigger test_results_set_updated_at before update on test_results for each row execute function set_updated_at();
